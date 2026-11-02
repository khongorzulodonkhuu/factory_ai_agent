"""Re-run QA + self-correction on an existing run, picking up manual edits (e.g. an injected bug).

    # 1. edit any file under runs/<run_id>/app/src/ or app/e2e/ to break something
    # 2. python repair.py <run_id>

    # or in one step: copy the run, break the cleaning fee (+ becomes -) and repair the copy
    python repair.py <run_id> --demo
"""

import json
import re
import shutil
import sys

from factory import RUNS_DIR, SCAFFOLD_FILES, app_dir, factory, new_run_id
from run import ensure_toolchain

# Every brief prices days x rate + cleaning fee; flipping the + breaks TR-3 ($280.00) and the pricing unit tests.
CLEANING_FEE_PLUS = re.compile(r"\+(\s*)((?:\w+\()?\w*[cC]leaning[fF]ee)")


def main() -> None:
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if len(args) != 1:
        sys.exit(__doc__)
    run_id = inject_bug(args[0]) if "--demo" in sys.argv else args[0]
    ensure_toolchain()
    state = json.loads((RUNS_DIR / run_id / "state.json").read_text())

    # The app folder on disk wins over the snapshot, so manual edits are what QA sees.
    root = app_dir(run_id)
    on_disk = {
        str(p.relative_to(root)): p.read_text()
        for folder in ("src", "e2e") for p in (root / folder).rglob("*")
        if p.is_file() and str(p.relative_to(root)) not in SCAFFOLD_FILES - {"src/theme.css"}
    }
    changed = [p for p, c in on_disk.items() if state["files"].get(p) != c]
    print(f"Files changed since the last run: {changed or 'none'}")

    result = factory.invoke({**state, "run_id": run_id, "files": on_disk}, {"recursion_limit": 100})
    print("\n" + (RUNS_DIR / result["run_id"] / "report.md").read_text())
    print(f"Self-correction steps:  python logs.py {run_id} --fixes")
    print(f"Dashboard and app:      python view.py {run_id}")


def inject_bug(source_id: str) -> str:
    """Copy a finished run to a new run id and turn '+ cleaningFee' into '- cleaningFee' in its source."""
    run_id = f"{new_run_id()}-repair-demo"
    # A fresh log, so the demo's dashboard and logs show only QA and the fix loop.
    shutil.copytree(RUNS_DIR / source_id, RUNS_DIR / run_id, symlinks=True,
                    ignore=shutil.ignore_patterns("node_modules", "test-results", "dist", "factory_log.jsonl"))
    for path in sorted((app_dir(run_id) / "src").rglob("*.ts")):
        if path.name.endswith(".test.ts"):
            continue
        code = path.read_text()
        match = CLEANING_FEE_PLUS.search(code)
        if match:
            path.write_text(code[:match.start()] + "-" + code[match.start() + 1:])
            line = code[:match.start()].count("\n") + 1
            print(f"Copied run {source_id} to {run_id}")
            print(f"Injected bug in {path.relative_to(app_dir(run_id))}:{line}")
            print(f"    before: {code.splitlines()[line - 1].strip()}")
            print(f"    after:  {path.read_text().splitlines()[line - 1].strip()}\n")
            return run_id
    sys.exit(f"No '+ cleaningFee' found in {source_id}; break a file by hand and run: python repair.py <run_id>")


if __name__ == "__main__":
    main()
