# Skill: Vitest unit tests (unit test writer agent)
- `import { describe, it, expect } from 'vitest'`; test files next to their module as src/lib/<name>.test.ts.
- Test only the pure functions in unit_test_targets, from their planned signatures and the spec (never from the implementation).
- Cover pricing math exactly as the test requirements state, filtering, and edge cases. No React, DOM or localStorage.
- Write only your one test file and keep it compact (a few focused cases per function), so it is always complete: every block and brace closed.
