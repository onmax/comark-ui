import { defineConfig, devices } from "@playwright/test";

// Agents share the machine, so each one can test its own build on its own port.
const port = Number(process.env.E2E_PORT ?? 4173);

// End-to-end checks of the components in Chromium. Each test renders its Markdown into a page of its own; the server
// only answers with the images in docs/public, so nothing needs the docs built.
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
    command: "node e2e/serve.ts docs/public",
    url: `http://127.0.0.1:${port}/favicon.svg`,
    reuseExistingServer: !process.env.CI,
  },
});
