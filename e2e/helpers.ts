import type { Page } from "@playwright/test";

// The generated HTML is usable before Nuxt has attached its client router.
export async function gotoHydrated(page: Page, path: string) {
  await page.goto(path);
  await page.waitForFunction(() => {
    if (!("useNuxtApp" in window) || typeof window.useNuxtApp !== "function") return false;
    const app: unknown = window.useNuxtApp();
    return (
      typeof app === "object" && app !== null && "isHydrating" in app && app.isHydrating === false
    );
  });
}
