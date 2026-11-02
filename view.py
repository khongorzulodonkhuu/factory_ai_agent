"""Open a finished run: its dashboard and the generated web app, in the browser.

    python view.py              # latest run
    python view.py <run_id>     # a specific run
    python view.py --no-app     # dashboard only

The app is served from runs/<run_id>/app/dist on a free local port until you press Ctrl+C (Python only, no Node needed).
"""

import functools
import sys
import threading
import webbrowser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

from config import RUNS_DIR


def latest_run() -> str:
    runs = sorted((p for p in RUNS_DIR.iterdir() if (p / "report.md").exists()), key=lambda p: (p / "report.md").stat().st_mtime)
    if not runs:
        sys.exit("No finished runs yet. Start one with: python run.py \"<prompt>\"")
    return runs[-1].name


def main() -> None:
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    open_run(args[0] if args else latest_run(), with_app="--no-app" not in sys.argv)


def open_run(run_id: str, with_app: bool = True) -> None:
    run_dir = RUNS_DIR / run_id
    if not (run_dir / "report.md").exists():
        sys.exit(f"Run {run_id} has no report yet (still running, or stopped: python run.py --resume {run_id}).")

    dashboard = run_dir / "dashboard.html"
    print(f"Run:        {run_id}")
    print(f"Report:     {run_dir / 'report.md'}")
    print(f"Dashboard:  {dashboard}")
    webbrowser.open(dashboard.resolve().as_uri())
    if not with_app:
        return

    app = run_dir / "app"
    if not (app / "dist" / "index.html").exists():
        sys.exit(f"No built app in {app / 'dist'}: the run did not pass the build stage.")
    # dist/ is a static build, so Python's own server is enough: no Node or npm install needed to view a run.
    handler = functools.partial(QuietHandler, directory=str(app / "dist"))
    server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
    url = f"http://localhost:{server.server_address[1]}"
    threading.Thread(target=server.serve_forever, daemon=True).start()
    print(f"Web app:    {url}   (log in with the Quick login cards; EN | MN in the header)")
    print("Press Ctrl+C to stop the app.")
    webbrowser.open(url)
    try:
        threading.Event().wait()
    except KeyboardInterrupt:
        server.shutdown()
        print("\nStopped.")


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args) -> None:
        pass


if __name__ == "__main__":
    main()
