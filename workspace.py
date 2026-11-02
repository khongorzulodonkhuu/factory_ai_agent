"""The generated app on disk: write the source of truth onto the scaffold and run the QA stages."""

import os
import re
import shutil
import socket
import subprocess
from pathlib import Path

from config import FOUNDATION_FILE, RUNS_DIR, STAGE_TIMEOUT_SECONDS, TEMPLATE_DIR

STAGES = [("build", ["npm", "run", "build"]), ("unit", ["npx", "vitest", "run"]),
          ("e2e", ["npx", "playwright", "test"])]


def app_dir(run_id: str) -> Path:
    return RUNS_DIR / run_id / "app"


def materialize(run_id: str, files: dict[str, str]) -> Path:
    """Write the source of truth onto the scaffold. node_modules is shared via symlink to stay fast."""
    target = app_dir(run_id)
    shutil.rmtree(target, ignore_errors=True)
    shutil.copytree(TEMPLATE_DIR, target, ignore=shutil.ignore_patterns("node_modules", "dist", "test-results"))
    link_node_modules(target / "node_modules", TEMPLATE_DIR / "node_modules")
    for path, code in files.items():
        (target / path).parent.mkdir(parents=True, exist_ok=True)
        (target / path).write_text(code)
    return target


def free_port() -> int:
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def link_node_modules(link: Path, source: Path) -> None:
    """Symlink on macOS/Linux; a directory junction on Windows (works without admin rights)."""
    if os.name == "nt":
        subprocess.run(["cmd", "/c", "mklink", "/J", str(link), str(source)], check=True, capture_output=True)
    else:
        link.symlink_to(source)


def run_stage(cmd: list[str], cwd: Path, env: dict | None = None) -> tuple[bool, str]:
    # On Windows npm/npx are .cmd files, so resolve the real executable first.
    cmd = [shutil.which(cmd[0]) or cmd[0], *cmd[1:]]
    try:
        proc = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, timeout=STAGE_TIMEOUT_SECONDS,
                              env={**os.environ, **(env or {})})
        return proc.returncode == 0, proc.stdout + proc.stderr
    except subprocess.TimeoutExpired:
        return False, f"{' '.join(cmd)} timed out after {STAGE_TIMEOUT_SECONDS}s"


def page_snapshots(target: Path, limit: int = 3) -> str:
    """What the page actually showed when each E2E test failed, so the fixer can tell app bugs from test bugs."""
    parts = []
    for ctx in sorted((target / "test-results").glob("*/error-context.md"))[:limit]:
        text = ctx.read_text()
        name = re.search(r"- Name: (.*)", text)
        snapshot = text.split("# Page snapshot", 1)[-1][:2500]
        parts.append(f"\n\nPage snapshot at failure of {name.group(1) if name else ctx.parent.name}:{snapshot}")
    return "".join(parts)


def run_qa(run_id: str, files: dict[str, str], upto: str = "e2e") -> dict:
    """Build -> unit -> e2e (stopping at `upto` or the first failure). No LLM."""
    target = materialize(run_id, files)
    results, failed_output, output = {}, "", ""
    for name, cmd in STAGES:
        ok, output = run_stage(cmd, target, {"E2E_PORT": str(free_port())} if name == "e2e" else None)
        results[name] = ok
        if not ok:
            # Compiler errors are most useful from the top, test failures from the bottom.
            failed_output = output[:6000] if name == "build" else output[-4000:]
            if name == "e2e":
                failed_output += page_snapshots(target)
            break
        if name == upto:
            break

    acceptance = {}
    if "e2e" in results:
        acceptance = {m.group(2): m.group(1) == "✓"
                      for m in re.finditer(r"([✓✘])\s+\d+ .*?›\s*([A-Z]+-\d+[a-z]?)", output)}
    passed = len(results) == len(STAGES) and all(results.values())
    return {"passed": passed, "stages": results, "acceptance": acceptance, "output": failed_output}


def progress(report: dict | None) -> tuple[int, int]:
    """Comparable QA progress: (stages passed, acceptance tests passed)."""
    if not report:
        return (-1, -1)
    return (sum(report["stages"].values()), sum(report["acceptance"].values()))


def clean_code(content: str) -> str:
    """Some models double-escape code in structured output (one line full of literal '\\n')."""
    if content.count("\n") <= 1 and content.count("\\n") > 2:
        content = content.replace("\\r\\n", "\n").replace("\\n", "\n").replace("\\t", "\t").replace('\\"', '"')
    return content.strip("`").removeprefix("tsx\n").removeprefix("typescript\n").removeprefix("ts\n")


def format_files(files: dict[str, str]) -> str:
    return "\n\n".join(f"### {path}\n```\n{code}\n```" for path, code in sorted(files.items()))


def relevant_files(files: dict[str, str], output: str) -> dict[str, str]:
    """The files a failure points at: paths in the output, components carrying the test ids it waited on,
    App.tsx for E2E failures, the shared types, and one level of relative imports (except App.tsx's)."""
    code_files = {p: c for p, c in files.items() if not p.endswith(".json")}
    paths = {p for p in re.findall(r"((?:src|e2e)/[\w./-]+\.tsx?)", output) if p in code_files}
    test_ids = set(re.findall(r"getByTestId\(['\"]([\w-]+)['\"]\)", output))
    paths |= {p for p, c in code_files.items()
              if p.startswith("src/") and any(f'"{t}"' in c or f"'{t}'" in c for t in test_ids)}
    if "e2e/" in output:
        paths |= {"src/App.tsx"} & code_files.keys()
    paths |= {FOUNDATION_FILE} & code_files.keys()
    # App.tsx imports every component, so following its imports would select the whole app again.
    for path in [p for p in paths if p != "src/App.tsx"]:
        for imp in re.findall(r"from ['\"](\.{1,2}/[^'\"]+)['\"]", code_files[path]):
            base = os.path.normpath(os.path.join(os.path.dirname(path), imp))
            paths |= {base + ext for ext in (".ts", ".tsx")} & code_files.keys()
    # Not worth the risk of hiding the culprit when the failure is broad.
    if len(paths) <= 1 or len(paths) > 0.7 * len(code_files):
        return code_files
    return {p: code_files[p] for p in sorted(paths)}
