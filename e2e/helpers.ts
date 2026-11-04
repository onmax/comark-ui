import type { Page } from "@playwright/test";

// A page of the plugins' HTML, served at a path of the test server so the images in docs/public load.
export async function fixture(
  page: Page,
  body: string,
  style = "main{width:600px;margin:auto}img{max-width:100%}",
) {
  await page.route("**/fixture/", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: `<!doctype html><meta charset="utf-8"><style>${style}</style><main>${body}</main>`,
    }),
  );
  await page.goto("/fixture/");
}
