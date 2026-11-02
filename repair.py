"""Re-run QA + self-correction on an existing run, picking up manual edits (e.g. an injected bug).

    # 1. edit any file under runs/<run_id>/app/src/ or app/e2e/ to break something
    # 2. python repair.py <run_id>
"""

import json
import sys

from factory import RUNS_DIR, SCAFFOLD_FILES, app_dir, factory


def main() -> None:
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    run_id = sys.argv[1]
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

    result = factory.invoke({**state, "files": on_disk}, {"recursion_limit": 100})
    print("\n" + (RUNS_DIR / result["run_id"] / "report.md").read_text())


if __name__ == "__main__":
    main()
