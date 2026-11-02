"""Read a factory run's log (runs/<run_id>/factory_log.jsonl) as a readable timeline.

    python logs.py                   # latest run
    python logs.py <run_id>          # a specific run
    python logs.py --runs            # list all runs with status and cost
    python logs.py <run_id> --fixes  # only QA results and fix loops, with explanations
    python logs.py --follow          # watch the latest run live (Ctrl+C to stop)
"""

import json
import sys
import time

from config import RUNS_DIR


def run_dirs() -> list:
    return sorted((p for p in RUNS_DIR.iterdir() if (p / "factory_log.jsonl").exists()), key=lambda p: (p / "factory_log.jsonl").stat().st_ctime)


def read(run_dir) -> list[dict]:
    return [json.loads(line) for line in (run_dir / "factory_log.jsonl").read_text().splitlines() if line.strip()]


def line(e: dict) -> str:
    cost = f"${e['usd']:.3f}" if e.get("usd") else ""
    tokens = f"{e['tokens']:,} tok" if e.get("tokens") else ""
    model = (e.get("model") or "").split(":")[-1]
    return f"{e['ts']}  {e['agent']:<18} {e['action'][:70]:<70} {model:<20} {tokens:>12} {cost:>8}"


def show(run_dir, fixes_only: bool = False) -> None:
    events = read(run_dir)
    print(f"Run {run_dir.name}  ({len(events)} events)\n")
    for e in events:
        if fixes_only and e["agent"] not in ("qa_agent", "fixer_agent", "security_agent"):
            continue
        print(line(e))
        if fixes_only and e["agent"] == "fixer_agent":
            print(f"{'':>10}why:    {e.get('explanation', '')}")
            print(f"{'':>10}tools:  {', '.join(e.get('tool_calls', []))}")
            print(f"{'':>10}lesson: {e.get('lesson', '')}\n")
    usd = sum(e.get("usd", 0) or 0 for e in events)
    tokens = sum(e.get("tokens", 0) or 0 for e in events)
    print(f"\nTotal: {tokens:,} tokens, ${usd:.2f}   |   report: {run_dir / 'report.md'}   |   dashboard: {run_dir / 'dashboard.html'}")


def list_runs() -> None:
    for d in run_dirs():
        events = read(d)
        done = next((e["action"] for e in reversed(events) if e["agent"] == "reporter"), "not finished")
        usd = sum(e.get("usd", 0) or 0 for e in events)
        print(f"{d.name}   {done:<45} ${usd:.2f}")


def follow(run_dir) -> None:
    seen = 0
    print(f"Following {run_dir.name} (Ctrl+C to stop)\n")
    while True:
        events = read(run_dir)
        for e in events[seen:]:
            print(line(e), flush=True)
        seen = len(events)
        if events and events[-1]["agent"] == "reporter":
            return
        time.sleep(2)


def main() -> None:
    args = sys.argv[1:]
    if "--runs" in args:
        return list_runs()
    named = [a for a in args if not a.startswith("--")]
    dirs = run_dirs()
    if not dirs:
        sys.exit("No runs yet. Start one with: python run.py \"<prompt>\"")
    run_dir = RUNS_DIR / named[0] if named else dirs[-1]
    if not (run_dir / "factory_log.jsonl").exists():
        sys.exit(f"No log for run {run_dir.name}")
    if "--follow" in args:
        return follow(run_dir)
    show(run_dir, fixes_only="--fixes" in args)


if __name__ == "__main__":
    main()
