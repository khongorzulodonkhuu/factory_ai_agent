"""Web app factory: brief -> spec + design tokens + architecture -> code + tests -> QA -> fix loop -> deploy.

Agents hand off typed artifacts (ProductSpec, DesignTokens, Architecture, SourceFile). `files` in state is
the single source of truth for the generated app, and every step is appended to
runs/<run_id>/factory_log.jsonl so the run can be audited against the factory diagram.

Course concepts in play: skills (skills/*.md loaded per agent), long-term memory (memory/lessons.jsonl),
short-term memory (LangGraph checkpointer, see run.py), prompt caching, and middleware (fixer.py).
"""

import json
import operator
from concurrent.futures import ThreadPoolExecutor
import re
import subprocess
import time
import uuid
from typing import Annotated

from typing_extensions import Required, TypedDict
from pydantic import BaseModel, Field
from langchain.chat_models import init_chat_model
from langgraph.graph import StateGraph, START, END
from langgraph.types import Send

import memory
from config import (
    CHEAP_MODEL, DEPLOY_TARGET, FOUNDATION_FILE, I18N_FILE, MAX_FIX_ITERATIONS, MAX_OUTPUT_TOKENS, MAX_PARSE_RETRIES,
    ROOT, RUNS_DIR, SCAFFOLD_FILES, STRONG_MODEL, TOKEN_BUDGET, USD_BUDGET,
)
from dashboard import render_dashboard
from fixer import run_fixer
from skills import load_skills
from usage import measure
from workspace import app_dir, clean_code, progress, run_qa, run_stage

SECURITY_PATTERNS = {
    r"\beval\(": "eval() executes arbitrary code",
    r"\bnew Function\(": "new Function() executes arbitrary code",
    r"dangerouslySetInnerHTML": "raw HTML injection (XSS risk)",
    r"\.innerHTML\s*=": "raw HTML injection (XSS risk)",
    r"document\.write\(": "document.write enables XSS",
    r"(api[_-]?key|secret|password)\s*[:=]\s*[\"'][^\"']{8,}": "hard-coded secret",
}


# ---------- Handoff artifacts ----------

class Feature(BaseModel):
    id: str = Field(description="e.g. F-1")
    role: str = Field(description="Which user role uses it")
    name: str
    description: str
    acceptance_criteria: list[str]


class TestRequirement(BaseModel):
    id: str = Field(description="Use the brief's ids if given, e.g. TR-1")
    title: str
    steps: list[str]
    pass_criteria: str


class ProductSpec(BaseModel):
    product_name: str
    summary: str
    roles: list[str]
    features: list[Feature]
    test_requirements: list[TestRequirement]
    seed_data_json: str = Field(description="Seed dataset as JSON text; copy verbatim from the brief if provided")


class ColorToken(BaseModel):
    name: str = Field(description="kebab-case, e.g. primary, primary-dark, surface, text-muted")
    value: str = Field(description="hex color")


class DesignTokens(BaseModel):
    colors: list[ColorToken]
    font_family: str = Field(description="CSS font-family stack")
    radius: str = Field(description="CSS length for cards and buttons, e.g. 0.75rem")
    style_guide: list[str] = Field(description="Short rules: layout, card style, badges, buttons, responsive grid")


class FilePlan(BaseModel):
    path: str = Field(description="Path under src/, e.g. src/lib/pricing.ts")
    purpose: str
    exports: list[str] = Field(description="Exact TypeScript export signatures other files rely on")
    imports_from: list[str] = Field(description="Other planned src/ files this file imports")


class TestId(BaseModel):
    test_id: str = Field(description="data-testid value")
    element: str = Field(description="What element carries it and where it appears")


class Architecture(BaseModel):
    files: list[FilePlan]
    ui_contract: list[TestId] = Field(description="Every data-testid the E2E tests may use")
    unit_test_targets: list[str] = Field(description="Pure functions worth unit testing, with file path")


class SourceFile(BaseModel):
    path: str
    content: str = Field(description="Complete file contents")


class TestFiles(BaseModel):
    files: list[SourceFile]


class TranslationEntry(BaseModel):
    en: str
    mn: str


class Translations(BaseModel):
    entries: list[TranslationEntry]


# ---------- State ----------

def merge_files(old: dict[str, str], new: dict[str, str]) -> dict[str, str]:
    return {**old, **new}


class FactoryInput(TypedDict, total=False):
    """A brief, or an existing app (spec + architecture + files) to repair."""
    brief: Required[str]
    run_id: str
    spec: dict
    design: dict
    architecture: dict
    files: dict[str, str]


class FactoryState(TypedDict, total=False):
    brief: str
    run_id: str
    spec: dict
    design: dict
    architecture: dict
    files: Annotated[dict[str, str], merge_files]
    qa_report: dict
    security_findings: list[str]
    fix_iteration: int
    pending_lesson: dict  # written by the fixer, kept by QA only if the fix helped
    deploy_url: str
    tokens_used: Annotated[int, operator.add]
    cached_tokens: Annotated[int, operator.add]  # cache reads: billed at ~10%, not counted against TOKEN_BUDGET
    cost_usd: Annotated[float, operator.add]
    log: Annotated[list[dict], operator.add]
    status: str


# ---------- Helpers ----------

class BudgetExceeded(Exception):
    pass


def new_run_id() -> str:
    return time.strftime("%Y%m%d-%H%M%S-") + uuid.uuid4().hex[:4]


def log_event(run_id: str, agent: str, action: str, **detail) -> dict:
    entry = {"ts": time.strftime("%H:%M:%S"), "agent": agent, "action": action, **detail}
    path = RUNS_DIR / run_id / "factory_log.jsonl"
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")
    extra = f" ({detail['tokens']:,} tokens)" if "tokens" in detail else ""
    print(f"[{entry['ts']}] {agent:<20} {action}{extra}", flush=True)
    return entry


def over_budget(spent: dict) -> str:
    if spent.get("tokens_used", 0) - spent.get("cached_tokens", 0) >= TOKEN_BUDGET:
        return "token budget reached"
    if spent.get("cost_usd", 0.0) >= USD_BUDGET:
        return f"cost budget reached (${USD_BUDGET:.2f})"
    return ""


def invoke_with_backoff(llm, messages, attempts: int = 4):
    """Retry transient failures (per-minute rate limits, overloaded servers). Daily quotas fail fast."""
    for attempt in range(attempts):
        try:
            return llm.invoke(messages)
        except Exception as e:
            msg = str(e)
            rate_limited = ("429" in msg or "RESOURCE_EXHAUSTED" in msg or "rate_limit" in msg) and "per day" not in msg
            overloaded = any(code in msg for code in ("503", "529", "UNAVAILABLE", "overloaded"))
            if not (rate_limited or overloaded) or attempt == attempts - 1:
                raise
            time.sleep(15 * (attempt + 1))


def call_llm(model: str, schema: type[BaseModel], system: str, user: str, spent: dict, shared: str = ""):
    """Structured LLM call with a budget check and bounded retries on unparseable output.

    `shared` is context that several calls repeat verbatim (spec, contract, file index). It goes first and,
    on Claude, is marked for prompt caching so repeated reads cost ~10% of normal input.
    Returns (parsed, usage) where usage = {"tokens", "cached", "usd"}.
    """
    if reason := over_budget(spent):
        raise BudgetExceeded(reason)
    # Current Claude models reject forced tool use, so ask for native JSON-schema output instead.
    method = "json_schema" if model.startswith("anthropic:") else "function_calling"
    llm = init_chat_model(model, max_tokens=MAX_OUTPUT_TOKENS).with_structured_output(
        schema, include_raw=True, method=method)
    content: str | list[dict] = user
    if shared:
        shared_block = {"type": "text", "text": shared}
        if model.startswith("anthropic:"):
            shared_block["cache_control"] = {"type": "ephemeral"}
        content = [shared_block, {"type": "text", "text": user}]
    usages = []
    for _ in range(MAX_PARSE_RETRIES + 1):
        out = invoke_with_backoff(llm, [("system", system), ("user", content)])
        usages.append(out["raw"].usage_metadata or {})
        if out["parsed"] is not None:
            return out["parsed"], measure(model, usages)
    raise ValueError(f"{schema.__name__} could not be parsed after {MAX_PARSE_RETRIES + 1} attempts")


def as_json(obj) -> str:
    return json.dumps(obj, ensure_ascii=False, separators=(",", ":"))


def theme_css(design: dict) -> str:
    """Design tokens -> Tailwind v4 theme, so classes like bg-primary / text-text-muted exist."""
    lines = ["@theme {"]
    lines += [f"  --color-{c['name']}: {c['value']};" for c in design["colors"]]
    lines += [f"  --font-sans: {design['font_family']};", f"  --radius-card: {design['radius']};", "}"]
    return "\n".join(lines) + "\n"


# ---------- Planning agents ----------

def pm_agent(state: FactoryState) -> dict:
    if not (state.get("brief") or "").strip():
        raise ValueError("Input is missing 'brief': paste the product brief / prompt to build.")
    run_id = state.get("run_id") or new_run_id()
    system = "You are the PM / requirements agent of a software factory.\n\n" + load_skills("requirements")
    # The spec drives every other agent and what judges test, and briefs may be one line: strong model.
    spec, usage = call_llm(STRONG_MODEL, ProductSpec, system, state["brief"], {})
    entry = log_event(run_id, "pm_agent", "handoff: spec", model=STRONG_MODEL, **usage,
                      skills=["requirements"], features=[f.id for f in spec.features],
                      tests=[t.id for t in spec.test_requirements])
    return {"run_id": run_id, "spec": spec.model_dump(), "tokens_used": usage["tokens"], "cached_tokens": usage["cached"], "cost_usd": usage["usd"], "log": [entry]}


def designer_agent(state: FactoryState) -> dict:
    system = "You are the UI/UX designer agent of a software factory.\n\n" + load_skills("design-tokens", "ui-design")
    spec = state["spec"]
    user = f"Product: {spec['product_name']}\n{spec['summary']}\nRoles: {', '.join(spec['roles'])}"
    design, usage = call_llm(CHEAP_MODEL, DesignTokens, system, user, state)
    entry = log_event(state["run_id"], "designer_agent", "handoff: design tokens", model=CHEAP_MODEL,
                      **usage, skills=["design-tokens", "ui-design"], colors=len(design.colors))
    return {"design": design.model_dump(), "tokens_used": usage["tokens"], "cached_tokens": usage["cached"], "cost_usd": usage["usd"], "log": [entry]}


def architect_agent(state: FactoryState) -> dict:
    system = ("You are the architect agent of a software factory.\n\n"
              + load_skills("architecture", "react-tailwind"))
    spec = state["spec"]
    arch, usage = call_llm(STRONG_MODEL, Architecture, system, as_json(spec), state)

    # Guardrail: keep planned files inside src/ and away from scaffold files.
    arch.files = [f for f in arch.files if f.path.startswith("src/") and f.path not in SCAFFOLD_FILES]

    entry = log_event(state["run_id"], "architect_agent", "handoff: architecture", model=STRONG_MODEL,
                      **usage, skills=["architecture", "react-tailwind"],
                      files=[f.path for f in arch.files], test_ids=len(arch.ui_contract))
    return {"architecture": arch.model_dump(), "tokens_used": usage["tokens"], "cached_tokens": usage["cached"], "cost_usd": usage["usd"], "log": [entry]}


SEED_FILE = "src/data/seed.json"


def plan_ready(state: FactoryState) -> dict:
    """Join point after designer + architect (no LLM): design tokens -> Tailwind theme, and the seed data
    the skills tell every coder to import, whether or not the architect planned that file."""
    seed = json.dumps(json.loads(state["spec"]["seed_data_json"]), indent=2)
    entry = log_event(state["run_id"], "plan_ready", f"design tokens -> src/theme.css, seed -> {SEED_FILE}")
    return {"files": {"src/theme.css": theme_css(state["design"]), SEED_FILE: seed}, "log": [entry]}


# ---------- Build agents ----------

def build_task(state: FactoryState) -> dict:
    return {"run_id": state["run_id"], "spec": state["spec"], "design": state["design"],
            "architecture": state["architecture"], "tokens_used": state.get("tokens_used", 0),
            "cost_usd": state.get("cost_usd", 0.0),
            "types": state.get("files", {}).get(FOUNDATION_FILE, "")}


def foundation_coder(state: FactoryState) -> dict:
    """Writes the shared types first: every other coder then imports real types, and the shared
    coder prompt gets cached before the parallel wave starts."""
    plan = next((f for f in state["architecture"]["files"] if f["path"] == FOUNDATION_FILE), None)
    return write_source({**build_task(state), "file": plan}, agent="foundation_coder") if plan else {}


def fan_out_build(state: FactoryState) -> list[Send]:
    """One coder per remaining planned file plus two independent test writers, all in parallel."""
    task = build_task(state)
    sends = [Send("coder_agent", {**task, "file": f})
             for f in state["architecture"]["files"] if f["path"] not in (FOUNDATION_FILE, SEED_FILE)]
    # One unit test writer per pure module, so no single answer grows long enough to be cut off.
    modules: dict[str, list[str]] = {}
    for target in state["architecture"].get("unit_test_targets", []):
        modules.setdefault(target.split(":")[0].strip(), []).append(target)
    sends += [Send("unit_test_writer", {**task, "module": m, "targets": t}) for m, t in modules.items()]
    # The E2E suite is the slowest writer, so two agents write its halves in parallel.
    sends += [Send("e2e_test_writer", {**task, "part": "acceptance"}),
              Send("e2e_test_writer", {**task, "part": "features"})]
    return sends


def coder_system() -> str:
    """Identical for every coder in a run (skills + recalled lessons), so it is part of the cached prefix."""
    return ("You are a coder agent. Write exactly one file of the app and return the complete file.\n\n"
            + load_skills("react-tailwind", "ui-design") + memory.as_prompt(memory.recall("coder")))


def coder_context(task: dict) -> str:
    """Identical for every coder in a run, so it is the cached prefix."""
    arch, spec = task["architecture"], task["spec"]
    return (f"All planned files: {as_json(arch['files'])}\n\nUI contract: {as_json(arch['ui_contract'])}\n\n"
            f"Design: {as_json(task['design'])}\n\n"
            f"Spec: {as_json({k: v for k, v in spec.items() if k != 'seed_data_json'})}\n\n"
            f"Seed data shape: {spec['seed_data_json'][:1500]}")


def coder_agent(task: dict) -> dict:
    return write_source(task, agent="coder_agent")


def write_source(task: dict, agent: str) -> dict:
    plan = task["file"]
    if plan["path"].endswith(".json"):
        # Seed data comes straight from the spec; no tokens needed.
        content = json.dumps(json.loads(task["spec"]["seed_data_json"]), indent=2)
        entry = log_event(task["run_id"], agent, f"handoff: code {plan['path']} (from spec seed)")
        return {"files": {plan["path"]: content}, "log": [entry]}

    user = f"Your file: {as_json(plan)}"
    if task.get("types") and plan["path"] != FOUNDATION_FILE:
        user += f"\n\n{FOUNDATION_FILE} is already written; import its types:\n```ts\n{task['types']}\n```"
    source, usage = call_llm(STRONG_MODEL, SourceFile, coder_system(), user, task,
                                      shared=coder_context(task))
    code = clean_code(source.content)
    entry = log_event(task["run_id"], agent, f"handoff: code {plan['path']}", model=STRONG_MODEL,
                      **usage, lines=code.count("\n") + 1)
    return {"files": {plan["path"]: code}, "tokens_used": usage["tokens"], "cached_tokens": usage["cached"], "cost_usd": usage["usd"], "log": [entry]}


def unit_test_writer(task: dict) -> dict:
    # Works from spec + architecture only, never from the code, so tests check the spec independently.
    lessons = memory.recall("unit_tests")
    system = ("You are the unit test writer agent of a software factory.\n\n" + load_skills("vitest-unit")
              + memory.as_prompt(lessons))
    module = task["module"]
    test_path = module.rsplit(".", 1)[0] + ".test.ts"
    user = (f"Spec: {as_json(task['spec'])}\n\nArchitecture: {as_json(task['architecture'])}\n\n"
            f"Your file: {test_path} only, testing {module}: {as_json(task['targets'])}")
    tests, usage = call_llm(CHEAP_MODEL, TestFiles, system, user, task)
    files = {test_path: clean_code(f.content) for f in tests.files[:1]}
    entry = log_event(task["run_id"], "unit_test_writer", f"handoff: unit tests {test_path}", model=CHEAP_MODEL,
                      **usage, skills=["vitest-unit"], lessons_recalled=len(lessons),
                      files=list(files))
    return {"files": files, "tokens_used": usage["tokens"], "cached_tokens": usage["cached"], "cost_usd": usage["usd"], "log": [entry]}


E2E_PARTS = {
    "acceptance": ("e2e/acceptance.spec.ts",
                   "Your part: write e2e/acceptance.spec.ts with ONLY one test per test requirement (TR-1, TR-2, ...) and "
                   "the 'QA: no broken values' test. Another agent writes the per-feature, I18N and pagination tests."),
    "features": ("e2e/features.spec.ts",
                 "Your part: write e2e/features.spec.ts with ONLY the per-feature tests (one per spec feature that no test "
                 "requirement exercises), the 'I18N: Mongolian UI' test and the pagination test. Another agent writes the "
                 "test-requirement tests; do not repeat them."),
}


def e2e_test_writer(task: dict) -> dict:
    lessons = memory.recall("e2e_tests")
    path, scope = E2E_PARTS[task.get("part", "acceptance")]
    system = ("You are the QA E2E test writer agent of a software factory.\n\n" + load_skills("playwright-e2e")
              + memory.as_prompt(lessons) + "\n\n" + scope)
    user = (f"Test requirements: {as_json(task['spec']['test_requirements'])}\n\n"
            f"UI contract: {as_json(task['architecture']['ui_contract'])}\n\n"
            f"Features: {as_json(task['spec']['features'])}\n\nSeed data: {task['spec']['seed_data_json']}")
    # The acceptance tests are what judges grade, so this one call gets the strong model.
    source, usage = call_llm(STRONG_MODEL, SourceFile, system, user, task)
    code = clean_code(source.content)
    entry = log_event(task["run_id"], "e2e_test_writer", f"handoff: e2e tests {path}", model=STRONG_MODEL,
                      **usage, skills=["playwright-e2e"], lessons_recalled=len(lessons),
                      lines=code.count("\n") + 1)
    return {"files": {path: code}, "tokens_used": usage["tokens"], "cached_tokens": usage["cached"], "cost_usd": usage["usd"], "log": [entry]}


# ---------- Localization ----------

T_CALL = re.compile(r"""\bt\(\s*(['"])((?:\\.|(?!\1).)*?)\1""")
TRANSLATE_CHUNK = 80


def ui_strings(files: dict[str, str]) -> list[str]:
    """English keys passed to t('...') anywhere in app code: components and label helpers (.ts or .tsx)."""
    found = {m.group(2).replace("\\'", "'").replace('\\"', '"')
             for path, code in files.items()
             if path.startswith("src/") and path.endswith((".ts", ".tsx")) and ".test." not in path
             for m in T_CALL.finditer(code)}
    return sorted(s for s in found if s.strip())


# Labels the scaffold's <StatusBadge> translates at runtime with t(status); always included for translation.
STATUS_LABELS = ["Pending", "Confirmed", "Approved", "Active", "Available", "Completed", "Unavailable",
                 "Cancelled", "Canceled", "Declined"]

PLACE_KEY = re.compile(r"city|state|address|location|pickup|drop_?off|instruction|rule|area|district|hub", re.I)


def data_strings(files: dict[str, str]) -> list[str]:
    """Place/address text in the seed data; components show it as t(value), so it is translated too."""
    try:
        seed = json.loads(files.get(SEED_FILE) or "{}")
    except json.JSONDecodeError:
        return []
    found: set[str] = set()

    def walk(node, key: str = "") -> None:
        if isinstance(node, dict):
            for k, v in node.items():
                walk(v, k)
        elif isinstance(node, list):
            for v in node:
                walk(v, key)
        elif isinstance(node, str) and PLACE_KEY.search(key) and not node.startswith("http") and len(node) < 200:
            found.add(node)
    walk(seed)
    return sorted(found)


def placeholders(text: str) -> set[str]:
    return set(re.findall(r"\{\w+\}", text))


def translator_agent(state: FactoryState) -> dict:
    """Keeps src/i18n/mn.json in sync with the UI: translates only strings that are new since the last
    pass (so re-runs after fixes are usually free). Existing entries are never dropped: the fixer may add
    translations for keys the extractor cannot see (e.g. t(variable)), and an unused entry costs nothing."""
    strings = sorted(set(ui_strings(state["files"])) | set(data_strings(state["files"])) | set(STATUS_LABELS))
    try:
        current = json.loads(state["files"].get(I18N_FILE) or "{}")
    except json.JSONDecodeError:
        current = {}
    kept = {en: mn for en, mn in current.items() if isinstance(mn, str) and mn.strip()}
    missing = [s for s in strings if s not in kept]

    system = "You are the localization agent of a software factory.\n\n" + load_skills("i18n-mongolian")
    chunks = [missing[i:i + TRANSLATE_CHUNK] for i in range(0, len(missing), TRANSLATE_CHUNK)]
    # Chunks are independent, so they are translated in parallel. Translation is optional (the UI falls back
    # to English), so a reached budget skips it instead of stopping the run before QA.
    try:
        with ThreadPoolExecutor(max_workers=max(1, len(chunks))) as pool:
            results = list(pool.map(lambda c: call_llm(CHEAP_MODEL, Translations, system, as_json(c), state), chunks))
    except BudgetExceeded:
        results = []
        chunks = []
    usages = [usage for _, usage in results]
    for chunk, (result, _) in zip(chunks, results):
        for e in result.entries:
            # Guardrail: a translation must keep exactly the same {placeholders} or it is dropped.
            if e.en in chunk and e.mn.strip() and placeholders(e.en) == placeholders(e.mn):
                kept[e.en] = e.mn.strip()

    tokens = sum(u["tokens"] for u in usages)
    cached = sum(u["cached"] for u in usages)
    usd = round(sum(u["usd"] for u in usages), 4)
    entry = log_event(state["run_id"], "translator_agent",
                      f"handoff: {I18N_FILE} ({len(kept)}/{len(strings)} strings in Mongolian)",
                      model=CHEAP_MODEL if usages else None, tokens=tokens, usd=usd, model_calls=len(usages),
                      skills=["i18n-mongolian"], new_strings=len(missing))
    return {"files": {I18N_FILE: json.dumps(dict(sorted(kept.items())), ensure_ascii=False, indent=2) + "\n"},
            "tokens_used": tokens, "cached_tokens": cached, "cost_usd": usd, "log": [entry]}


# ---------- QA, review, repair ----------

def qa_agent(state: FactoryState) -> dict:
    """Build -> unit tests -> E2E acceptance tests. Also decides whether the last fix earned a lesson. No LLM."""
    report = run_qa(state["run_id"], state["files"])
    update: dict = {"qa_report": report, "pending_lesson": {}}

    pending = state.get("pending_lesson") or {}
    kept = False
    if pending.get("lesson") and progress(report) > progress(state.get("qa_report")):
        kept = memory.remember(pending["lesson"], pending["applies_to"], state["run_id"], pending["stage"])

    summary = ", ".join(f"{k}:{'ok' if v else 'FAIL'}" for k, v in report["stages"].items())
    entry = log_event(state["run_id"], "qa_agent", f"test report: {'PASS' if report['passed'] else 'FAIL'} ({summary})",
                      acceptance=report["acceptance"], **({"lesson_saved": pending["lesson"]} if kept else {}))
    return {**update, "log": [entry]}


def security_agent(state: FactoryState) -> dict:
    """Static scan for dangerous patterns in app code. No LLM."""
    findings = [
        f"{path}:{line_no}: {reason}"
        for path, code in state["files"].items() if path.startswith("src/")
        for line_no, line in enumerate(code.splitlines(), 1)
        for pattern, reason in SECURITY_PATTERNS.items()
        if re.search(pattern, line, re.IGNORECASE)
    ]
    entry = log_event(state["run_id"], "security_agent", f"scan: {len(findings)} findings", findings=findings)
    return {"security_findings": findings, "log": [entry]}


def fixer_agent(state: FactoryState) -> dict:
    iteration = state.get("fix_iteration", 0) + 1
    if reason := over_budget(state):
        raise BudgetExceeded(reason)
    fix = run_fixer(state, iteration)
    entry = log_event(state["run_id"], "fixer_agent", f"fix loop {iteration}/{MAX_FIX_ITERATIONS}",
                      model=fix["model"], tokens=fix["tokens"], cached=fix["cached"], usd=fix["usd"],
                      model_calls=fix["model_calls"],
                      tool_calls=fix["tool_calls"], lessons_recalled=fix["lessons_recalled"],
                      changed=sorted(fix["files"]), explanation=fix["explanation"], lesson=fix["lesson"])
    pending = {"lesson": fix["lesson"], "applies_to": fix["applies_to"], "stage": fix["stage"]}
    return {"files": fix["files"], "fix_iteration": iteration, "pending_lesson": pending,
            "tokens_used": fix["tokens"], "cached_tokens": fix["cached"], "cost_usd": fix["usd"], "log": [entry]}


def deploy_agent(state: FactoryState) -> dict:
    """Publishes the built app. gh-pages pushes dist/ to the gh-pages branch of this git repo's origin."""
    target = app_dir(state["run_id"])
    if DEPLOY_TARGET != "gh-pages":
        entry = log_event(state["run_id"], "deploy_agent", "skipped (FACTORY_DEPLOY=none); built app in dist/")
        return {"deploy_url": f"file://{target / 'dist' / 'index.html'}", "log": [entry]}

    ok, output = run_stage(["npx", "gh-pages", "-d", "dist", "-m", f"Deploy {state['run_id']}"], target)
    url = ""
    if ok:
        remote = subprocess.run(["git", "remote", "get-url", "origin"], cwd=ROOT, capture_output=True, text=True).stdout
        match = re.search(r"github\.com[:/]([^/]+)/([^/.\s]+)", remote)
        url = f"https://{match.group(1)}.github.io/{match.group(2)}/" if match else ""
    entry = log_event(state["run_id"], "deploy_agent", f"gh-pages: {'ok' if ok else 'FAILED'}",
                      url=url, output="" if ok else output[-1500:])
    return {"deploy_url": url, "log": [entry]}


def reporter(state: FactoryState) -> dict:
    report, findings = state["qa_report"], state.get("security_findings", [])
    iterations, tokens = state.get("fix_iteration", 0), state.get("tokens_used", 0)
    if report["passed"] and not findings:
        status = "success"
    elif reason := over_budget(state):
        status = f"stopped: {reason}"
    else:
        status = "stopped: max fix iterations reached"

    log = state.get("log", [])
    tokens_by_agent: dict[str, int] = {}
    calls_by_agent: dict[str, int] = {}
    usd_by_agent: dict[str, float] = {}
    for e in log:
        if "tokens" in e:
            tokens_by_agent[e["agent"]] = tokens_by_agent.get(e["agent"], 0) + e["tokens"]
            calls_by_agent[e["agent"]] = calls_by_agent.get(e["agent"], 0) + e.get("model_calls", 1)
            usd_by_agent[e["agent"]] = usd_by_agent.get(e["agent"], 0.0) + e.get("usd", 0.0)
    cached_total = sum(e.get("cached", 0) for e in log)
    lessons_saved = [e["lesson_saved"] for e in log if "lesson_saved" in e]

    spec = state["spec"]
    agent_lines = sum(c.count("\n") + 1 for p, c in state["files"].items() if p != "src/theme.css")
    lines = [
        f"# Factory report: {spec['product_name']}",
        f"- Status: **{status}**",
        f"- QA stages: {', '.join(f'{k}={'ok' if v else 'FAIL'}' for k, v in report['stages'].items())}",
        f"- Security findings: {len(findings)}",
        f"- Fix iterations: {iterations}/{MAX_FIX_ITERATIONS}",
        f"- Tokens: {tokens - cached_total:,} billed at full rate / {TOKEN_BUDGET:,} budget, plus {cached_total:,} read from prompt cache (~10% price)",
        f"- Cost: ${state.get('cost_usd', 0.0):.2f} / ${USD_BUDGET:.2f} budget",
        f"- Deployed: {state.get('deploy_url') or 'not deployed'}",
        f"- Agent-written lines: {agent_lines:,} across {len(state['files'])} files; human interventions: 0",
        "", "## Acceptance tests",
        "| Id | Requirement | Result |", "|---|---|---|",
        *[f"| {t['id']} | {t['title']} | {'PASS' if report['acceptance'].get(t['id']) else 'FAIL / not run'} |"
          for t in spec["test_requirements"]],
        "", "## Tokens by agent", "| Agent | Model calls | Tokens | Cost |", "|---|---|---|---|",
        *[f"| {a} | {calls_by_agent[a]} | {t:,} | ${usd_by_agent[a]:.3f} |" for a, t in tokens_by_agent.items()],
        "", "## Lessons saved to memory", *([f"- {l}" for l in lessons_saved] or ["- none"]),
        "", "## Features (E2E test per feature)", "| Id | Role | Feature | Result |", "|---|---|---|---|",
        *[f"| {f['id']} | {f['role']} | {f['name']} | "
          f"{'PASS' if report['acceptance'].get(f['id']) else 'FAIL' if f['id'] in report['acceptance'] else 'via TRs'} |"
          for f in spec["features"]],
        "", "## Files", *[f"- {p}" for p in sorted(state["files"])],
    ]
    run_dir = RUNS_DIR / state["run_id"]
    (run_dir / "report.md").write_text("\n".join(lines) + "\n")
    (run_dir / "dashboard.html").write_text(render_dashboard(state, log + [{"agent": "reporter", "action": f"done: {status}",
                                                                            "ts": time.strftime("%H:%M:%S")}], status))
    # Snapshot for repair mode (repair.py): everything needed to re-enter at QA.
    snapshot = {k: state[k] for k in ("brief", "run_id", "spec", "design", "architecture", "files")}
    (run_dir / "state.json").write_text(json.dumps(snapshot, ensure_ascii=False, indent=1))
    entry = log_event(state["run_id"], "reporter", f"done: {status}", tokens_total=tokens,
                      usd_total=round(state.get("cost_usd", 0.0), 4))
    return {"status": status, "log": [entry]}


# ---------- Routing ----------

def route_start(state: FactoryState) -> str:
    # Repair mode: an existing app (e.g. with an injected bug) goes straight to QA.
    return "qa_agent" if state.get("files") and state.get("architecture") else "pm_agent"


def route_after_review(state: FactoryState) -> str:
    if state["qa_report"]["passed"] and not state.get("security_findings"):
        return "deploy_agent"
    if state.get("fix_iteration", 0) >= MAX_FIX_ITERATIONS or over_budget(state):
        return "reporter"
    return "fixer_agent"


# ---------- Graph ----------

builder = StateGraph(FactoryState, input_schema=FactoryInput)
builder.add_node("pm_agent", pm_agent)
builder.add_node("designer_agent", designer_agent)
builder.add_node("architect_agent", architect_agent)
builder.add_node("plan_ready", plan_ready)
builder.add_node("foundation_coder", foundation_coder)
builder.add_node("coder_agent", coder_agent)
builder.add_node("unit_test_writer", unit_test_writer)
builder.add_node("e2e_test_writer", e2e_test_writer)
builder.add_node("translator_agent", translator_agent)
builder.add_node("qa_agent", qa_agent)
builder.add_node("security_agent", security_agent)
builder.add_node("fixer_agent", fixer_agent)
builder.add_node("deploy_agent", deploy_agent)
builder.add_node("reporter", reporter)

builder.add_conditional_edges(START, route_start, ["pm_agent", "qa_agent"])
builder.add_edge("pm_agent", "designer_agent")
builder.add_edge("pm_agent", "architect_agent")
builder.add_edge(["designer_agent", "architect_agent"], "plan_ready")
builder.add_edge("plan_ready", "foundation_coder")
builder.add_conditional_edges("foundation_coder", fan_out_build, ["coder_agent", "unit_test_writer", "e2e_test_writer"])
builder.add_edge("coder_agent", "translator_agent")
builder.add_edge("unit_test_writer", "translator_agent")
builder.add_edge("e2e_test_writer", "translator_agent")
builder.add_edge("translator_agent", "qa_agent")
builder.add_edge("qa_agent", "security_agent")
builder.add_conditional_edges("security_agent", route_after_review, ["fixer_agent", "deploy_agent", "reporter"])
builder.add_edge("fixer_agent", "translator_agent")
builder.add_edge("deploy_agent", "reporter")
builder.add_edge("reporter", END)


def compile_factory(checkpointer=None):
    """run.py passes a SQLite checkpointer so interrupted runs resume; Studio supplies its own."""
    return builder.compile(checkpointer=checkpointer)


factory = compile_factory()
