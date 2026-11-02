import { defineConfig, devices } from "@playwright/test";

// The factory picks a free port per QA run (E2E_PORT) so a preview left running elsewhere never collides.
const PORT = Number(process.env.E2E_PORT ?? 4173);
const URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "e2e",
  timeout: 30_000,
  retries: 0,
  reporter: "list",
  use: { baseURL: URL, trace: "off" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: { command: `npx vite preview --port ${PORT} --strictPort`, url: URL, reuseExistingServer: false, timeout: 60_000 },
});
