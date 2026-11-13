import { defineConfig, devices } from "@playwright/test";
import path from "node:path";

/**
 * End-to-end test of a full daily session with OpenRouter mocked.
 *   npm run test:e2e
 * Starts the mock API (tests/e2e/mock-openrouter.mjs) and the app on its own port, with a fresh
 * database and its own build folder, so it doesn't touch your progress or a running dev server.
 */
const PORT = 3211;
const MOCK_PORT = 4011;
process.env.E2E_DB ??= path.join(process.cwd(), ".e2e", `progress-${Date.now()}.db`);

export default defineConfig({
  testDir: "tests/e2e",
  globalSetup: "./tests/e2e/warmup.ts",
  timeout: 180_000,
  expect: { timeout: 45_000 },
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "off",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: `node tests/e2e/mock-openrouter.mjs ${MOCK_PORT}`,
      port: MOCK_PORT,
      reuseExistingServer: false,
    },
    {
      command: `npx next dev -p ${PORT}`,
      url: `http://localhost:${PORT}/api/settings`,
      timeout: 240_000,
      reuseExistingServer: false,
      env: {
        DB_PATH: process.env.E2E_DB,
        NEXT_DIST_DIR: ".next-e2e",
        OPENROUTER_BASE_URL: `http://localhost:${MOCK_PORT}/api/v1`,
        OPENROUTER_API_KEY: "test",
        NEXT_TELEMETRY_DISABLED: "1",
      },
    },
  ],
});
