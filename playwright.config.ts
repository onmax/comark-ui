import { defineConfig, devices } from "@playwright/test";

// Agents share the machine, so each one can test its own build on its own port.
const port = Number(process.env.E2E_PORT ?? 4173);

// A few end-to-end checks of the built docs site in Chromium, so CI proves the demos work without slowing it down.
export default defineConfig({
  // Run the docs migration checks in CI alongside the component contracts.
  testDir: ".",
  testMatch: ["e2e/*.e2e.ts", "docs/e2e/*.e2e.ts"],
  fullyParallel: true,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    ...devices["Desktop Chrome"],
    // Headless Chromium hides scrollbars; show them, so a test sees the shift a desktop reader would.
    launchOptions: { ignoreDefaultArgs: ["--hide-scrollbars"] },
  },
  webServer: {
    command: "node e2e/serve.ts",
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: !process.env.CI,
  },
});
