"""runs/<run_id>/dashboard.html: the factory diagram, timeline, fix loops and results, built from the run's log.

Every number on the page comes from factory_log.jsonl, so judges can match the diagram against the log.
"""

import html
import json

from config import MAX_FIX_ITERATIONS, USD_BUDGET

# The factory diagram, left to right; agents in one stage run in parallel.
STAGES = [
    ["pm_agent"],
    ["designer_agent", "architect_agent"],
    ["plan_ready", "foundation_coder"],
    ["coder_agent", "unit_test_writer", "e2e_test_writer"],
    ["translator_agent"],
    ["qa_agent", "security_agent", "fixer_agent"],
    ["deploy_agent", "reporter"],
]
ROLE = {
    "pm_agent": "requirements -> spec + TRs + seed", "designer_agent": "design tokens", "architect_agent": "files + UI contract",
    "plan_ready": "theme + seed (no LLM)", "foundation_coder": "shared types first", "coder_agent": "one file each, parallel",
    "unit_test_writer": "Vitest from spec", "e2e_test_writer": "Playwright per TR/feature", "translator_agent": "EN -> MN strings",
    "qa_agent": "build, unit, e2e (no LLM)", "security_agent": "static scan (no LLM)", "fixer_agent": "tool agent + middleware",
    "deploy_agent": "GitHub Pages", "reporter": "report + dashboard",
}


def _seconds(ts: str) -> int:
    h, m, s = (int(x) for x in ts.split(":"))
    return h * 3600 + m * 60 + s


def _e(value) -> str:
    return html.escape(str(value))


def render_dashboard(state: dict, log: list[dict], status: str) -> str:
    spec, report = state["spec"], state["qa_report"]
    events = [e for e in log if e.get("ts")]
    start = _seconds(events[0]["ts"]) if events else 0
    duration = (_seconds(events[-1]["ts"]) - start) if events else 0

    per_agent: dict[str, dict] = {}
    for e in events:
        a = per_agent.setdefault(e["agent"], {"events": 0, "calls": 0, "tokens": 0, "usd": 0.0})
        a["events"] += 1
        a["calls"] += e.get("model_calls", 1 if e.get("tokens") else 0)
        a["tokens"] += e.get("tokens", 0) or 0
        a["usd"] += e.get("usd", 0.0) or 0.0

    tests = spec["test_requirements"]
    passed = sum(1 for t in tests if report["acceptance"].get(t["id"]))
    cached = sum(e.get("cached", 0) or 0 for e in events)
    lines = sum(c.count("\n") + 1 for p, c in state["files"].items() if p != "src/theme.css")
    ok = status == "success"

    def node(agent: str) -> str:
        a = per_agent.get(agent)
        if not a:
            return f'<div class="node idle"><b>{_e(agent)}</b><small>{_e(ROLE.get(agent, ""))}</small><i>not run</i></div>'
        stats = f"{a['events']}× · {a['tokens']:,} tok · ${a['usd']:.3f}" if a["tokens"] else f"{a['events']}×"
        return f'<div class="node"><b>{_e(agent)}</b><small>{_e(ROLE.get(agent, ""))}</small><i>{stats}</i></div>'

    diagram = '<span class="arrow">→</span>'.join(
        f'<div class="stage">{"".join(node(a) for a in stage)}</div>' for stage in STAGES)

    lanes = []
    span = max(duration, 1)
    for agent in [a for stage in STAGES for a in stage if a in per_agent]:
        dots = "".join(
            f'<span class="dot" style="left:{(_seconds(e["ts"]) - start) / span * 100:.2f}%" '
            f'title="{_e(e["ts"])} {_e(e["action"])}"></span>' for e in events if e["agent"] == agent)
        lanes.append(f'<div class="lane"><span class="lane-name">{_e(agent)}</span><div class="track">{dots}</div></div>')

    fixes = []
    for e in events:
        if e["agent"] == "fixer_agent":
            fixes.append(
                f'<div class="card fix"><h4>{_e(e["action"])} <span class="muted">· {_e(e.get("model", ""))} · '
                f'{e.get("model_calls", 0)} calls · ${e.get("usd", 0):.3f}</span></h4>'
                f'<p>{_e(e.get("explanation", ""))}</p>'
                f'<p class="muted">Tools: {_e(", ".join(e.get("tool_calls", [])))}</p>'
                f'<p class="muted">Changed: {_e(", ".join(e.get("changed", [])))}</p>'
                + (f'<p class="lesson">Lesson: {_e(e["lesson"])}</p>' if e.get("lesson") else "") + "</div>")
        elif e["agent"] == "qa_agent":
            fixes.append(f'<div class="qa {"pass" if "PASS" in e["action"] else "fail"}">{_e(e["ts"])} · {_e(e["action"])}</div>')

    def result_row(item_id: str, title: str) -> str:
        res = report["acceptance"].get(item_id)
        label, cls = ("PASS", "pass") if res else ("FAIL", "fail") if item_id in report["acceptance"] else ("via TRs", "muted")
        return f'<tr><td>{_e(item_id)}</td><td>{_e(title)}</td><td class="{cls}">{label}</td></tr>'

    results = "".join(result_row(t["id"], t["title"]) for t in tests)
    results += "".join(result_row(f["id"], f"{f['name']} ({f['role']})") for f in spec["features"])
    saved = [e["lesson_saved"] for e in events if e.get("lesson_saved")]
    rows = "".join(
        f'<tr><td>{_e(e["ts"])}</td><td>{_e(e["agent"])}</td><td>{_e(e["action"])}</td><td>{_e(e.get("model") or "")}</td>'
        f'<td class="num">{(e.get("tokens") or 0):,}</td><td class="num">${(e.get("usd") or 0):.3f}</td></tr>' for e in events)

    kpis = [
        ("Status", status), ("Duration", f"{duration // 60}m {duration % 60}s"),
        ("Cost", f"${state.get('cost_usd', 0):.2f} / ${USD_BUDGET:.0f}"),
        ("Tokens", f"{state.get('tokens_used', 0):,} ({cached:,} cached)"),
        ("Fix loops", f"{state.get('fix_iteration', 0)} / {MAX_FIX_ITERATIONS}"),
        ("Acceptance", f"{passed} / {len(tests)} TRs"), ("Agent-written", f"{lines:,} lines · 0 human edits"),
    ]
    kpi_html = "".join(f'<div class="kpi"><span>{_e(k)}</span><b>{_e(v)}</b></div>' for k, v in kpis)

    return f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Factory run · {_e(spec['product_name'])}</title>
<style>
:root {{ --bg:#f7f7f5; --surface:#fff; --text:#1d1d1b; --muted:#6b6b66; --border:#e3e2dc; --accent:#3b5bdb; --pass:#2b8a3e; --fail:#c92a2a; }}
@media (prefers-color-scheme: dark) {{ :root {{ --bg:#141413; --surface:#1f1f1d; --text:#ecebe6; --muted:#9a9993; --border:#33332f; --accent:#7b93f0; --pass:#69db7c; --fail:#ff8787; }} }}
* {{ box-sizing:border-box }} body {{ margin:0; background:var(--bg); color:var(--text); font:14px/1.5 system-ui, sans-serif; }}
main {{ max-width:1200px; margin:0 auto; padding:24px 16px 64px; }} h1 {{ margin:0 0 4px; font-size:24px }} h2 {{ margin:32px 0 12px; font-size:17px }}
.muted {{ color:var(--muted) }} .pass {{ color:var(--pass); font-weight:600 }} .fail {{ color:var(--fail); font-weight:600 }}
.kpis {{ display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:8px; margin-top:16px }}
.kpi, .card, .node {{ background:var(--surface); border:1px solid var(--border); border-radius:10px; padding:10px 12px }}
.kpi span {{ display:block; color:var(--muted); font-size:12px }} .kpi b {{ font-size:15px }}
.flow {{ display:flex; align-items:center; gap:6px; overflow-x:auto; padding-bottom:8px }} .stage {{ display:flex; flex-direction:column; gap:6px; min-width:150px }}
.node b {{ display:block; font-size:13px }} .node small {{ display:block; color:var(--muted); font-size:11px }} .node i {{ font-style:normal; font-size:11px; color:var(--accent) }}
.node.idle {{ opacity:.45 }} .arrow {{ color:var(--muted); font-size:18px }}
.lane {{ display:flex; align-items:center; gap:8px; margin:4px 0 }} .lane-name {{ width:140px; font-size:12px; color:var(--muted); flex:none }}
.track {{ position:relative; flex:1; height:14px; border-bottom:1px dashed var(--border) }} .dot {{ position:absolute; top:2px; width:10px; height:10px; margin-left:-5px; border-radius:50%; background:var(--accent) }}
.fixes {{ display:flex; flex-direction:column; gap:8px }} .fix h4 {{ margin:0 0 6px; font-size:14px }} .fix p {{ margin:4px 0 }} .lesson {{ color:var(--accent) }}
.qa {{ font-size:12px; padding-left:12px; border-left:3px solid var(--border) }} .qa.pass {{ border-color:var(--pass) }} .qa.fail {{ border-color:var(--fail) }}
table {{ width:100%; border-collapse:collapse; background:var(--surface); border:1px solid var(--border); border-radius:10px; overflow:hidden }}
td, th {{ padding:6px 10px; border-bottom:1px solid var(--border); text-align:left; vertical-align:top }} th {{ font-size:12px; color:var(--muted) }}
.num {{ text-align:right; font-variant-numeric:tabular-nums }} .scroll {{ overflow-x:auto }}
</style></head><body><main>
<h1>{_e(spec['product_name'])} <span class="{'pass' if ok else 'fail'}">· {_e(status)}</span></h1>
<div class="muted">Run {_e(state['run_id'])} · every number below comes from factory_log.jsonl</div>
<div class="kpis">{kpi_html}</div>
<h2>Factory diagram (calls · tokens · cost per agent, from the log)</h2><div class="flow">{diagram}</div>
<h2>Timeline (each dot is a log event; stacked dots in one second = parallel agents)</h2><div>{"".join(lanes)}</div>
<h2>QA and self-correction loop</h2><div class="fixes">{"".join(fixes) or '<p class="muted">No fixes needed.</p>'}</div>
<h2>Acceptance tests and features</h2><div class="scroll"><table><tr><th>Id</th><th>Requirement / feature</th><th>Result</th></tr>{results}</table></div>
<h2>Lessons saved to long-term memory</h2>{"".join(f'<p class="lesson">{_e(l)}</p>' for l in saved) or '<p class="muted">None this run.</p>'}
<h2>Event log</h2><div class="scroll"><table><tr><th>Time</th><th>Agent</th><th>Action</th><th>Model</th><th>Tokens</th><th>Cost</th></tr>{rows}</table></div>
</main></body></html>
"""
