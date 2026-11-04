import { defineConfig } from "@playwright/test";

// The site must already run on this port: `pnpm build && pnpm preview`. No webServer, so Playwright never reuses
// another agent's server on a busy port.
export default defineConfig({
  testDir: ".",
  testMatch: "*.e2e.mjs",
  workers: 1,
  timeout: 30_000,
  use: { baseURL: `http://127.0.0.1:${process.env.PORT ?? 4391}` },
});
