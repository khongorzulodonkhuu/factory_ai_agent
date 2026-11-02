"""Long-term memory: lessons the fixer learned, recalled by agents in later runs.

A lesson is stored only after the next QA run shows the fix actually helped, so the memory holds
verified rules rather than guesses. memory/lessons.jsonl is committed with the repo.
"""

import json
import time

from config import MEMORY_FILE

AUDIENCES = ("coder", "unit_tests", "e2e_tests", "any")


def _all() -> list[dict]:
    if not MEMORY_FILE.exists():
        return []
    return [json.loads(line) for line in MEMORY_FILE.read_text().splitlines() if line.strip()]


def remember(lesson: str, applies_to: str, run_id: str, stage: str) -> bool:
    lesson = lesson.strip()
    if not lesson or any(l["lesson"].lower() == lesson.lower() for l in _all()):
        return False
    MEMORY_FILE.parent.mkdir(parents=True, exist_ok=True)
    entry = {"ts": time.strftime("%Y-%m-%d %H:%M"), "run_id": run_id, "stage": stage,
             "applies_to": applies_to if applies_to in AUDIENCES else "any", "lesson": lesson}
    with MEMORY_FILE.open("a") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")
    return True


def recall(*audiences: str, limit: int = 8) -> list[str]:
    """Most recent lessons for these audiences (plus 'any')."""
    wanted = set(audiences) | {"any"}
    return [l["lesson"] for l in _all() if l["applies_to"] in wanted][-limit:]


def as_prompt(lessons: list[str]) -> str:
    if not lessons:
        return ""
    return "\n\nLessons from previous factory runs (verified fixes; follow them):\n" + "\n".join(f"- {l}" for l in lessons)
