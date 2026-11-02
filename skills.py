"""Skills: each agent's know-how lives in skills/<name>.md and is loaded into its system prompt.

Agents load only the skills their task needs (e.g. the fixer loads the Playwright skill only for E2E
failures), which keeps prompts short and lets the team edit agent behaviour without touching code.
"""

from functools import cache

from config import SKILLS_DIR


@cache
def _read(name: str) -> str:
    return (SKILLS_DIR / f"{name}.md").read_text().strip()


# The brief can change on the day; skills are defaults and must never veto what the brief asks for.
PRECEDENCE = ("Skills below are defaults. The brief and the spec built from it always win: when they ask for something "
              "a skill rules out or does differently (e.g. a map, accounts with passwords, another layout), build what they ask.")


def load_skills(*names: str) -> str:
    return "\n\n".join([PRECEDENCE, *(_read(n) for n in names)])
