"""Run the factory on a brief.

    python run.py briefs/wheels2go.md        # brief from a file
    python run.py "Build a todo web app..."   # brief as text
    pbpaste | python run.py -                 # brief from stdin
    python run.py briefs/wheels2go-prompt.md --seed briefs/wheels2go-seed.json   # add a seed dataset
    python run.py --resume <run_id>           # continue an interrupted run from its last checkpoint

When the run finishes, the dashboard and the generated web app open in the browser (Ctrl+C stops the app).
Add --no-open to skip that.
"""

import shutil
import sqlite3
import subprocess
import sys
from pathlib import Path

from langgraph.checkpoint.sqlite import SqliteSaver

from config import CHECKPOINT_DB, RUNS_DIR, TEMPLATE_DIR
from factory import compile_factory, new_run_id
from view import open_run


def ensure_toolchain() -> None:
    if not shutil.which("npm"):
        sys.exit("Node.js 20+ is required (npm not found).")
    if not (TEMPLATE_DIR / "node_modules").exists():
        print("Installing app scaffold dependencies (one time)...", flush=True)
        npm, npx = shutil.which("npm"), shutil.which("npx")
        subprocess.run([npm, "install", "--no-audit", "--no-fund"], cwd=TEMPLATE_DIR, check=True)
        subprocess.run([npx, "playwright", "install", "chromium"], cwd=TEMPLATE_DIR, check=True)


def read_brief(arg: str) -> str:
    if arg == "-":
        return sys.stdin.read()
    # A long or multi-line argument is the prompt itself; checking it as a path fails on macOS (name too long).
    if "\n" in arg or len(arg) > 255:
        return arg
    path = Path(arg)
    return path.read_text() if path.is_file() else arg


def main() -> None:
    args = sys.argv[1:]
    auto_open = "--no-open" not in args
    args = [a for a in args if a != "--no-open"]
    seed = ""
    if "--seed" in args:
        i = args.index("--seed")
        seed = Path(args[i + 1]).read_text()
        args = args[:i] + args[i + 2:]
    if not args or (args[0] == "--resume" and len(args) != 2) or (args[0] != "--resume" and len(args) != 1):
        sys.exit(__doc__)
    ensure_toolchain()

    # Short-term memory: every finished agent step is checkpointed per run (thread_id = run_id),
    # so a crash or rate limit costs only the step that failed.
    CHECKPOINT_DB.parent.mkdir(parents=True, exist_ok=True)
    graph = compile_factory(SqliteSaver(sqlite3.connect(CHECKPOINT_DB, check_same_thread=False)))

    resuming = args[0] == "--resume"
    run_id = args[1] if resuming else new_run_id()
    config = {"configurable": {"thread_id": run_id}, "recursion_limit": 100}
    try:
        brief = None if resuming else read_brief(args[0]) + (f"\n\nPre-populated seed dataset (JSON):\n{seed}" if seed else "")
        result = graph.invoke(None if resuming else {"brief": brief, "run_id": run_id}, config)
    except Exception:
        print(f"\nRun {run_id} stopped with an error. Fix the cause, then continue with:\n"
              f"    python run.py --resume {run_id}\n", file=sys.stderr)
        raise

    run_dir = RUNS_DIR / result["run_id"]
    print("\n" + (run_dir / "report.md").read_text())
    print(f"Run folder:  {run_dir}")
    print(f"Dashboard:   {run_dir / 'dashboard.html'}")
    print(f"Web app:     {run_dir / 'app'}")
    print(f"\nOpen them again any time with:\n    python view.py {result['run_id']}\n")
    if auto_open:
        open_run(result["run_id"])


if __name__ == "__main__":
    main()
