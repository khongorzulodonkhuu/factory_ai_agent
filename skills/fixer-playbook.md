# Skill: fixer playbook
1. The failing stage output and the most likely files are already in your task; do not call run_checks before editing. Read other files only if needed (list_files / read_file).
2. Find the root cause before editing. Build errors: fix types/imports at the source. Unit failures: decide whether code or test contradicts the spec. E2E failures: compare the page snapshot with what the test waited for.
3. Prefer fixing app code. Fix a test only when it contradicts the spec or ui_contract, or assumes state the seed never contains and never creates. Never delete tests or weaken assertions on test requirements.
4. Write complete files with write_file, then call run_checks on the failing stage to verify. Do not repeat a previous attempt that failed.
5. Finish by calling finish(explanation, lesson, applies_to). The lesson is one general rule future agents should follow to avoid this class of bug, without file names.
