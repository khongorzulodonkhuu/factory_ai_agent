"""Factory settings. Every value can be overridden from .env."""

try:
    from dotenv import load_dotenv

    load_dotenv()
except ImportError:  # viewing a finished run (view.py, logs.py) needs only plain Python
    pass

import os
from pathlib import Path

ROOT = Path(__file__).parent
TEMPLATE_DIR = ROOT / "app_template"
RUNS_DIR = ROOT / "runs"
SKILLS_DIR = ROOT / "skills"
MEMORY_FILE = ROOT / "memory" / "lessons.jsonl"
CHECKPOINT_DB = RUNS_DIR / "checkpoints.sqlite"

# Cheap model for well-scoped text tasks, strong model where code is planned or written.
# The fixer starts on FIX_MODEL and escalates to STRONG_MODEL after FIX_ESCALATE_AFTER failed iterations.
CHEAP_MODEL = os.getenv("FACTORY_CHEAP_MODEL", "anthropic:claude-haiku-5-5")
STRONG_MODEL = os.getenv("FACTORY_STRONG_MODEL", "anthropic:claude-opus-5-5")
FIX_MODEL = os.getenv("FACTORY_FIX_MODEL", "anthropic:claude-sonnet-5-5")
FIX_ESCALATE_AFTER = int(os.getenv("FACTORY_FIX_ESCALATE_AFTER", "2"))
MAX_OUTPUT_TOKENS = 16000  # a full component file plus thinking must fit without truncation

# Guardrails
TOKEN_BUDGET = int(os.getenv("FACTORY_TOKEN_BUDGET", "1500000"))
USD_BUDGET = float(os.getenv("FACTORY_USD_BUDGET", "10"))  # hard stop for one run, in dollars (hackathon limit: $15)

# $ per 1M tokens (input, output) for cost tracking; unknown models count as $0.
# Cache reads cost 10% of input, cache writes 125%.
PRICES = {
    "claude-opus-5-5": (4.00, 20.00),
    "claude-sonnet-5-5": (2.00, 10.00),
    "claude-haiku-5-5": (0.10, 0.50),
}
MAX_FIX_ITERATIONS = int(os.getenv("FACTORY_MAX_FIX_ITERATIONS", "5"))
FIXER_MAX_MODEL_CALLS = 10   # per fix iteration (ModelCallLimitMiddleware)
FIXER_MAX_CHECK_RUNS = 3     # run_checks calls per fix iteration (ToolCallLimitMiddleware)
MAX_PARSE_RETRIES = 2
STAGE_TIMEOUT_SECONDS = 240
DEPLOY_TARGET = os.getenv("FACTORY_DEPLOY", "none")  # "gh-pages" or "none"

# Files the factory provides; agents may not overwrite them.
SCAFFOLD_FILES = {"src/main.tsx", "src/index.css", "src/theme.css", "src/i18n.tsx", "src/icons.tsx", "src/status.tsx"}
I18N_FILE = "src/i18n/mn.json"  # written by the translator agent
FOUNDATION_FILE = "src/types.ts"
