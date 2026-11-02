"""Fixer agent: a tool-using create_agent that reads, edits and re-checks the app until its stage passes.

Middleware (module 3 concepts) does the steering and the guardrails:
- escalate_model (wrap_model_call): cheaper FIX_MODEL first, STRONG_MODEL after repeated failed iterations
- ModelCallLimitMiddleware / ToolCallLimitMiddleware: stop runaway loops inside one iteration
- ContextEditingMiddleware: clear old tool output so long sessions stay cheap (non-Claude models only;
  Claude 5.5 rejects edited history because thinking blocks are bound to it)
- ModelRetryMiddleware: retry transient API errors (rate limits, 5xx)
- AnthropicPromptCachingMiddleware: cache the growing transcript on Claude
"""

from dataclasses import dataclass
from typing import Callable, Literal

from langchain.agents import create_agent
from langchain.agents.middleware import (
    ClearToolUsesEdit, ContextEditingMiddleware, ModelCallLimitMiddleware, ModelRequest, ModelResponse,
    ModelRetryMiddleware, ToolCallLimitMiddleware, wrap_model_call,
)
from langchain.chat_models import init_chat_model
from langchain_anthropic.middleware import AnthropicPromptCachingMiddleware
from langchain.messages import AIMessage, HumanMessage
from langchain.tools import tool
from langgraph.errors import GraphRecursionError

import memory
from config import (
    FIX_ESCALATE_AFTER, FIX_MODEL, FIXER_MAX_CHECK_RUNS, FIXER_MAX_MODEL_CALLS, MAX_OUTPUT_TOKENS,
    SCAFFOLD_FILES, STRONG_MODEL,
)
from skills import load_skills
from usage import measure
from workspace import clean_code, format_files, relevant_files, run_qa


@dataclass
class FixContext:
    iteration: int


def model_for(iteration: int) -> str:
    return STRONG_MODEL if iteration > FIX_ESCALATE_AFTER else FIX_MODEL


_models: dict[str, object] = {}


def _model(name: str):
    if name not in _models:
        _models[name] = init_chat_model(name, max_tokens=MAX_OUTPUT_TOKENS)
    return _models[name]


@wrap_model_call
def escalate_model(request: ModelRequest, handler: Callable[[ModelRequest], ModelResponse]) -> ModelResponse:
    """Use the cheaper fix model first; escalate to the strong model once fixes keep failing."""
    return handler(request.override(model=_model(model_for(request.runtime.context.iteration))))


def build_tools(run_id: str, files: dict[str, str], shown: set[str], outcome: dict):
    """Tools act on a working copy of the files; the node merges what changed back into state."""

    @tool
    def list_files() -> str:
        """List every file in the app."""
        return "\n".join(sorted(files))

    @tool
    def read_file(path: str) -> str:
        """Read the complete contents of one file of the app."""
        if path not in files:
            return f"No such file: {path}"
        shown.add(path)
        return files[path]

    @tool
    def write_file(path: str, content: str) -> str:
        """Replace a file (or create a new one) with its complete new contents."""
        if path in SCAFFOLD_FILES or not path.startswith(("src/", "e2e/")):
            return f"Rejected: {path} is a scaffold file or outside src/ and e2e/."
        if path in files and path not in shown:
            return f"Rejected: read {path} before overwriting it."
        files[path] = clean_code(content)
        shown.add(path)
        outcome["changed"].add(path)
        return f"Wrote {path}"

    @tool
    def run_checks(stage: Literal["build", "unit", "e2e"]) -> str:
        """Run QA on the current files up to `stage` (build -> unit -> e2e). Returns PASS or the failure output."""
        report = run_qa(run_id, files, upto=stage)
        failed = [k for k, v in report["stages"].items() if not v]
        return f"PASS ({', '.join(report['stages'])})" if not failed else f"FAIL at {failed[0]}:\n{report['output']}"

    @tool(return_direct=True)
    def finish(explanation: str, lesson: str,
               applies_to: Literal["coder", "unit_tests", "e2e_tests", "any"]) -> str:
        """Call once when done. explanation: root cause and fix, at most two short sentences.
        lesson: one general rule future agents should follow to avoid this class of bug (no file names).
        applies_to: which agents the lesson is for."""
        outcome.update(explanation=explanation, lesson=lesson, applies_to=applies_to)
        return "Recorded."

    return [list_files, read_file, write_file, run_checks, finish]


def run_fixer(state: dict, iteration: int) -> dict:
    report = state["qa_report"]
    failing = [k for k, v in report["stages"].items() if not v]
    files = dict(state["files"])
    shown = relevant_files(files, report["output"])
    seen: set[str] = set(shown)
    outcome = {"changed": set(), "explanation": "", "lesson": "", "applies_to": "any"}

    stage_skills = {"e2e": ["playwright-e2e"], "unit": ["vitest-unit"]}.get(failing[0] if failing else "", [])
    lessons = memory.recall("coder", "unit_tests", "e2e_tests")
    system = ("You are the fixer agent of a software factory. Repair the generated web app so the failing "
              "QA stage passes.\n\n" + load_skills("fixer-playbook", "react-tailwind", "ui-design", *stage_skills)
              + memory.as_prompt(lessons))
    previous = [e["explanation"] for e in state.get("log", []) if e["agent"] == "fixer_agent"]
    task = (f"Failing stage: {failing}\n\nOutput:\n{report['output']}\n\n"
            f"Security findings: {state.get('security_findings', [])}\n\n"
            f"Previous fix attempts (do not repeat): {previous}\n\n"
            f"Test requirements: {state['spec']['test_requirements']}\n\n"
            f"UI contract: {state['architecture']['ui_contract']}\n\n"
            f"Seed data: {state['spec']['seed_data_json']}\n\n"
            f"Files most likely involved (already read for you; use read_file for others):\n{format_files(shown)}")

    uses_claude = any(m.startswith("anthropic:") for m in (FIX_MODEL, STRONG_MODEL))
    agent = create_agent(
        model=_model(FIX_MODEL),
        tools=build_tools(state["run_id"], files, seen, outcome),
        system_prompt=system,
        context_schema=FixContext,
        middleware=[
            escalate_model,
            # Each fixer call re-sends the whole (append-only) transcript; caching makes the repeated
            # prefix cost ~10% on Claude. Ignored for other providers.
            AnthropicPromptCachingMiddleware(unsupported_model_behavior="ignore"),
            # Surface auth/quota errors instead of letting the agent end silently with no work done.
            ModelRetryMiddleware(max_retries=2, on_failure="error"),
            ModelCallLimitMiddleware(run_limit=FIXER_MAX_MODEL_CALLS, exit_behavior="end"),
            ToolCallLimitMiddleware(tool_name="run_checks", run_limit=FIXER_MAX_CHECK_RUNS),
            # Claude 5.5 binds thinking blocks to the exact history, so editing old tool output is rejected:
            # keep the transcript append-only there (the model-call limit bounds its length instead).
            *([] if uses_claude else [ContextEditingMiddleware(
                edits=[ClearToolUsesEdit(trigger=15000, keep=3, exclude_tools=["finish"])])]),
        ],
    )
    # ModelCallLimitMiddleware is the real stop; each middleware adds graph steps, so the recursion
    # limit only backs it up. Streaming keeps the last state, and file edits already live in `files`,
    # so hitting a limit still hands the work done so far back to QA instead of crashing the factory.
    last: dict = {"messages": []}
    try:
        for last in agent.stream({"messages": [HumanMessage(task)]}, {"recursion_limit": 12 * FIXER_MAX_MODEL_CALLS},
                                 context=FixContext(iteration=iteration), stream_mode="values"):
            pass
    except GraphRecursionError:
        outcome["explanation"] = outcome["explanation"] or "Stopped at the step limit before calling finish."

    ai = [m for m in last["messages"] if isinstance(m, AIMessage)]
    cost = measure(model_for(iteration), [m.usage_metadata or {} for m in ai])
    if not outcome["explanation"]:
        outcome["explanation"] = (ai[-1].text if ai else "")[:300] or "Stopped before calling finish."
    return {
        "files": {p: files[p] for p in outcome["changed"]},
        "explanation": outcome["explanation"], "lesson": outcome["lesson"], "applies_to": outcome["applies_to"],
        "model": model_for(iteration), "model_calls": len(ai),
        "tool_calls": [c["name"] for m in ai for c in m.tool_calls],
        "tokens": cost["tokens"], "cached": cost["cached"], "usd": cost["usd"],
        "lessons_recalled": len(lessons), "stage": failing[0] if failing else "security",
    }
