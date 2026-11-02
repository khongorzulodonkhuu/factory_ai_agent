# Wheels2Go Agentic Web App Factory

Give the factory a product prompt; a pipeline of specialised agents writes the requirements, design tokens, React code and tests, runs QA, fixes its own bugs and reports what it did. No human edits the generated code.

```bash
python run.py "Build a fully functional, responsive web application called Wheels2Go, a two-sided P2P car rental platform. The application must support two primary user roles: Car Owner and Renter."
```

## For judges: see a finished run in 1 minute (no API key, no Node)

The repo includes one complete run on the organisers' prompt (`runs/20261102-155204-a05d`: PASS, 7m53s, $3.37). To open it you only need Python 3:

```bash
git clone https://github.com/khongorzulodonkhuu/factory_ai_agent.git && cd factory_ai_agent
python3 view.py 20261102-155204-a05d
```

This opens the **dashboard** (agents, timeline, fix loops, tokens, cost, test results) and serves the **generated Wheels2Go app** at `http://localhost:<port>`. Log in with the *Quick login* cards (one owner, one renter); **EN | MN** in the header switches the language. Press Ctrl+C to stop.

- Requirements and acceptance tests the agents wrote: `runs/20261102-155204-a05d/report.md`
- The generated source and tests: `runs/20261102-155204-a05d/app/src`, `runs/20261102-155204-a05d/app/e2e`
- Full agent log: `python3 logs.py 20261102-155204-a05d` (or `--fixes` for only the QA and fix loops)

To run the factory yourself on the same or a changed prompt, follow the Quick start below.

## Quick start (macOS)

```bash
git clone https://github.com/khongorzulodonkhuu/factory_ai_agent.git && cd factory_ai_agent
python3.12 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env    # put your ANTHROPIC_API_KEY in .env
python run.py "Build a fully functional, responsive web application called Wheels2Go, a two-sided P2P car rental platform. The application must support two primary user roles: Car Owner and Renter."
```

When the run finishes, the dashboard and the generated web app **open in your browser automatically** (press Ctrl+C in the terminal to stop the app). To open them again later:

```bash
python view.py
```

Each step is explained in detail below.

## After the run: where everything is

At the end of a run the terminal prints the run id and the paths, for example:

```
Run folder:  runs/20261031-110406-63b9
Dashboard:   runs/20261031-110406-63b9/dashboard.html
Web app:     runs/20261031-110406-63b9/app

Open the dashboard and the web app in your browser with:
    python view.py 20261031-110406-63b9
```

`python view.py` (no argument opens the latest run) does three things:

1. Opens **`dashboard.html`** in your browser: the factory diagram, timeline, fix loops, costs and test results.
2. Starts the **generated web app** on a free local port.
3. Opens the app in your browser, at an address like `http://localhost:59040`.

The app keeps running until you press **Ctrl+C** in that terminal.

In the app:

- **Log in** with the *Quick login* cards: one owner, one renter, no password.
- **EN | MN** in the header switches the language.

To see an older run:

```bash
python logs.py --runs      # lists every run id with its status and cost
python view.py <run_id>    # opens that run
```

To do it by hand instead of using `view.py`:

```bash
open runs/<run_id>/dashboard.html
python3 -m http.server 4173 -d runs/<run_id>/app/dist    # then open http://localhost:4173
```

A typical run on that prompt takes about 10 minutes and costs about $3–4.5 on Claude. It produces a bilingual (English/Mongolian) car-rental marketplace with login, listings, search and filters, pagination, checkout with price breakdown, owner approvals, earnings, pickup addresses with instructions and an FAQ.

---

## 1. Setup (once)

Requirements: **Python 3.12+**, **Node.js 20+**, **git** and an **Anthropic API key**. About 1 GB of free disk space covers npm packages and Chromium for the tests.

On a Mac, check what is already installed:

```bash
python3 --version   # needs 3.12 or newer
node --version      # needs v20 or newer
git --version       # if missing, macOS offers to install the Command Line Tools
```

If Python or Node is missing or too old, install them with [Homebrew](https://brew.sh):

```bash
brew install python@3.12 node
```

Then set up the factory:

```bash
git clone https://github.com/khongorzulodonkhuu/factory_ai_agent.git
cd factory_ai_agent

python3.12 -m venv .venv          # use python3.12 explicitly: macOS's default python3 may be 3.9
source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env               # then put your key in .env
```

`.env` needs one line at minimum:

```
ANTHROPIC_API_KEY=sk-ant-...
```

On the first run the factory installs the app scaffold's npm packages and Playwright's Chromium into `app_template/`. This happens once and takes about a minute.

---

## 2. Run the factory

```bash
# Prompt as text
python run.py "Build a fully functional, responsive web application called Wheels2Go, ..."

# Prompt from a file (the organisers' full input prompt is in briefs/)
python run.py briefs/wheels2go-prompt.md

# Optional: seed the app with the organisers' dataset
python run.py briefs/wheels2go-prompt.md --seed briefs/wheels2go-seed.json

# Continue a run that stopped (rate limit, network, Ctrl+C) from its last finished step
python run.py --resume <run_id>

# Don't open the browser at the end (e.g. on a server)
python run.py briefs/wheels2go-prompt.md --no-open
```

The terminal prints one line per agent step while the run is going. When it finishes it prints the report and the paths of the generated app.

Every run gets its own folder, `runs/<run_id>/` (for example `runs/20261031-110406-63b9/`):

| File | What it is |
|---|---|
| `dashboard.html` | **Start here.** Factory diagram with calls, tokens and cost per agent (all taken from the log), timeline showing the parallel agents, every fix loop with its explanation, and the TR and feature test results |
| `report.md` | Status, QA stages, acceptance tests (TR-1…), feature tests, tokens and cost per agent, lessons learned |
| `factory_log.jsonl` | The raw event log: one JSON line per agent handoff, QA result and fix loop |
| `app/` | The generated web app (source, tests and built `dist/`) |
| `state.json` | Snapshot of the run's spec, design and files (used by `repair.py`) |

---

## 3. Look at the generated app

```bash
python view.py <run_id>     # or with no run id for the latest run; Ctrl+C stops it
```

`view.py` opens the dashboard and serves the app on a free port, then opens both in your browser.

To serve the app by hand, run `python3 -m http.server 4173 -d runs/<run_id>/app/dist` and open **http://localhost:4173**.

- **Log in:** use the *Quick login* cards on the login screen (an owner and a renter). No password is needed.
- **Language:** switch between English and Mongolian with **EN | MN** in the header. In Mongolian, prices show in tugrik (₮) at a fixed rate. You can change the rate as `MNT_PER_USD` in `app_template/src/i18n.tsx`.
- **Port in use:** if 4173 is taken, use another port, for example `4175`.

### Run the generated app's test suite

Runs made on your machine share the scaffold's npm packages. For the included example run, install them once with `cd runs/<run_id>/app && npm install && npx playwright install chromium`.

```bash
cd runs/<run_id>/app
npm run build              # type-check + production build
npx vitest run             # unit tests
npx playwright test        # end-to-end acceptance tests (TR-1…, F-…, I18N, QA)
```

---

## 4. Logs and evidence

```bash
python logs.py --runs                 # every run with its status and cost
python logs.py                        # timeline of the latest run
python logs.py <run_id>               # timeline of one run
python logs.py <run_id> --fixes       # only QA results and fix loops, with the fixer's reasoning and lesson
python logs.py --follow               # watch the latest run live while it is running

open runs/<run_id>/dashboard.html     # Windows: start, Linux: xdg-open
cat  runs/<run_id>/report.md
```

Every number on the dashboard and in the report comes from `factory_log.jsonl`, so you can check the factory diagram against the log.

---

## 5. Watch the graph in LangGraph Studio

```bash
langgraph dev
```

Open the Studio link it prints (`https://smith.langchain.com/studio/?baseUrl=http://127.0.0.1:2024`). Use Chrome; Safari blocks localhost.

- Select the **`factory`** graph to see the real pipeline: the parallel branches, and the QA ⇄ fixer loop.
- To run from Studio, put the prompt in the `brief` input field and press Submit. This starts a real, billed run.
- To see per-agent traces in the **Trace** tab, add `LANGSMITH_API_KEY` and `LANGSMITH_TRACING=true` to `.env`. Without them the graph still runs and shows its state.

---

## 6. Self-correction demo: inject a bug

1. Break something in a finished run's app. For example, in `runs/<run_id>/app/src/lib/pricing.ts`, change the `+` that adds the cleaning fee into `-`.
2. Run:
   ```bash
   python repair.py <run_id>
   python logs.py <run_id> --fixes
   ```

The factory reads the files from disk and starts at QA. A test fails, the fixer agent reads the failing output and the relevant files, edits them, re-runs the checks itself, and QA passes again. The fix and the lesson it learned appear in the log, the report and the dashboard. In our tests the pricing bug was fixed in one loop for about $0.07.

---

## 7. How the factory works

```
prompt ─> pm_agent ─┬─> designer_agent ──┐
                    └─> architect_agent ─┴─> plan_ready ─> foundation_coder ─┬─> coder_agent × N   (parallel)
                                                                             ├─> unit_test_writer  (parallel)
                                                                             └─> e2e_test_writer   (parallel)
                                                                                        │
                                                                                 translator_agent (EN → MN)
                                                                                        │
                                           ┌──── fixer_agent <── FAIL ── security_agent <── qa_agent <┘
                                           └──> translator_agent ──> qa_agent (again)
                                                                     PASS ──> deploy_agent ──> reporter
```

| Agent | Model | Hands off |
|---|---|---|
| `pm_agent` | Opus | `ProductSpec`: features, acceptance criteria, TR-1…N with exact values, seed data. Works from a one-line prompt. |
| `designer_agent` | Haiku | `DesignTokens` → Tailwind theme |
| `architect_agent` | Opus | `Architecture`: file plan with export signatures, `data-testid` UI contract |
| `plan_ready` | – | Writes the theme and seed data (no LLM) |
| `foundation_coder` | Opus | `src/types.ts` first, so parallel coders share real types and the prompt cache warms up |
| `coder_agent` × N | Opus | One file each, in parallel |
| `unit_test_writer` ×N | Haiku | Vitest tests written from the spec, never from the code; one agent per `src/lib` module in parallel |
| `e2e_test_writer` | Opus | Playwright tests: one per TR, one per feature, plus "QA: no broken values" and "I18N: Mongolian UI" |
| `translator_agent` | Haiku | Mongolian translations for every UI string and seeded place name. It only translates new strings, so re-runs are free. |
| `qa_agent` | – | `build` → `vitest` → `playwright` (no LLM) |
| `security_agent` | – | Static scan for eval, innerHTML, dangerouslySetInnerHTML and hard-coded secrets |
| `fixer_agent` | Sonnet → Opus | Tool-using agent (`read_file`, `write_file`, `run_checks`, `finish`) with middleware |
| `deploy_agent` | – | GitHub Pages when `FACTORY_DEPLOY=gh-pages` |
| `reporter` | – | `report.md`, `dashboard.html`, `state.json` |

**Single source of truth:** the `files` map in the graph state. Agents write files into it, and QA materialises it onto the scaffold for every check.

### Course concepts used

| Concept | Where | What it does |
|---|---|---|
| Skills | `skills/*.md` | Each agent's know-how lives in markdown (requirements, design tokens, architecture, React/Tailwind, UI design, Playwright, Vitest, Mongolian localization, fixer playbook). The fixer loads the Playwright skill only for E2E failures. |
| Long-term memory | `memory/lessons.jsonl` | After a fix, the fixer writes a general lesson. It is kept only if the next QA run shows the fix helped, and later runs put it into the coder, test-writer and fixer prompts. |
| Short-term memory | SQLite checkpointer (`runs/checkpoints.sqlite`) | Every finished step is saved, so `--resume` continues from the last finished step. |
| Prompt caching | `call_llm(shared=…)`, `AnthropicPromptCachingMiddleware` | Context shared by all coders and the fixer's growing transcript are read from cache at about 10% of the price. |
| Middleware | `fixer.py` | Model escalation (Sonnet, then Opus after 2 failed loops), model-call and tool-call limits, retries on transient errors, and prompt caching |

### Guardrails

- **Dollar budget** (`FACTORY_USD_BUDGET`) and **token budget** (`FACTORY_TOKEN_BUDGET`): the run stops and still writes its report when a budget is reached.
- **Fix loops** are capped (`FACTORY_MAX_FIX_ITERATIONS`, default 5). Each loop allows at most 10 model calls and 3 `run_checks`. The fixer never repeats an attempt that already failed.
- **Fixer edit limits:** it cannot touch scaffold files, write outside `src/` or `e2e/`, overwrite a file it has not read, delete tests or weaken assertions.
- **Error handling:** stage timeouts, retries when structured output fails to parse, and backoff on per-minute rate limits and overloaded servers. Daily quota errors stop the run immediately.

---

## 8. Configuration (`.env`)

| Variable | Default | Meaning |
|---|---|---|
| `ANTHROPIC_API_KEY` | – | Required |
| `ANTHROPIC_BASE_URL` | Anthropic API | Only for a gateway or proxy key |
| `FACTORY_CHEAP_MODEL` | `anthropic:claude-haiku-5-5` | Design, unit tests, translation |
| `FACTORY_STRONG_MODEL` | `anthropic:claude-opus-5-5` | Spec, architecture, code, E2E tests, escalated fixes |
| `FACTORY_FIX_MODEL` | `anthropic:claude-sonnet-5-5` | Fixer's first loops |
| `FACTORY_FIX_ESCALATE_AFTER` | `2` | Failed loops before the fixer switches to the strong model |
| `FACTORY_USD_BUDGET` | `10` | Hard dollar cap for one run (the hackathon allows $15) |
| `FACTORY_TOKEN_BUDGET` | `1500000` | Full-price tokens per run (cache reads are not counted) |
| `FACTORY_MAX_FIX_ITERATIONS` | `5` | QA ⇄ fixer loops |
| `FACTORY_DEPLOY` | `none` | `gh-pages` publishes the app to this repo's GitHub Pages |

Models use LangChain ids. The factory ships with Claude only; to use another provider, install its package first (e.g. `pip install langchain-openai` for `openai:…`, `pip install langchain-google-genai` for `google_genai:…`).

---

## 9. Deploy to GitHub Pages

1. In the repository, go to **Settings → Pages → Source: Deploy from a branch** and choose **`gh-pages`**.
2. In `.env`, set `FACTORY_DEPLOY=gh-pages`.
3. Run the factory. When QA passes, `deploy_agent` pushes `dist/` to the `gh-pages` branch and writes the URL (`https://<user>.github.io/<repo>/`) into the report. This needs git credentials that can push to the repo.

---

## 10. Repository layout

```
run.py            start or resume a run
view.py           open a run's dashboard and serve its web app in the browser
repair.py         re-run QA + self-correction on an existing run (bug-injection demo)
logs.py           readable timeline of a run's log
factory.py        the LangGraph graph and all agents except the fixer
fixer.py          the fixer agent (create_agent + tools + middleware)
workspace.py      writes the app to disk and runs build / unit / e2e
dashboard.py      renders runs/<id>/dashboard.html from the log
memory.py         long-term lessons;  skills.py  loads skills/*.md
config.py         settings and prices;  usage.py  token and dollar accounting
skills/           agent know-how (markdown)
memory/           lessons.jsonl (committed, grows with every run)
app_template/     Vite + React + TS + Tailwind + Vitest + Playwright scaffold, i18n runtime, icons
briefs/           the organisers' prompt and seed dataset
runs/20261102-155204-a05d/  a complete example run (dashboard, report, log, generated app)
langgraph.json    LangGraph Studio entry (graph "factory")
```

---

## 11. Troubleshooting

| Symptom | Fix |
|---|---|
| `401 invalid x-api-key` | Check `ANTHROPIC_API_KEY` in `.env`. A gateway key also needs `ANTHROPIC_BASE_URL`. |
| Run stopped with an error | `python run.py --resume <run_id>`; finished steps are not repeated |
| `stopped: cost budget reached` | Raise `FACTORY_USD_BUDGET`, then resume |
| `port already used` when serving by hand | `python3 -m http.server 4175 -d runs/<run_id>/app/dist` |
| Studio shows "Failed to fetch" | Make sure `langgraph dev` is still running, and use Chrome instead of Safari |
| Playwright browser missing | `cd app_template && npx playwright install chromium` |
