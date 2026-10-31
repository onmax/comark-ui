import { expect, test } from "@playwright/test";
import { embedBundle } from "../packages/embed/test/embed-bundle.ts";
import type { EmbedAttributes } from "../packages/embed/src/index.ts";

declare global {
  interface Window {
    EmbedTest: {
      embed: (
        renderer: string,
        target: HTMLElement,
        initial: EmbedAttributes,
      ) => {
        update: (attrs: EmbedAttributes) => void;
        stop: () => void;
      };
    };
    embedTest: ReturnType<Window["EmbedTest"]["embed"]>;
  }
}

const spotify = {
  provider: "spotify",
  src: "https://open.spotify.com/embed/track/123",
  href: "https://open.spotify.com/track/123",
  size: "compact",
};
const post = {
  provider: "x",
  src: "https://platform.twitter.com/embed/Tweet.html?id=123&dnt=true",
  href: "https://x.com/user/status/123",
  size: "post",
};
let bundle: string;
test.beforeAll(async () => {
  bundle = await embedBundle();
});

for (const renderer of ["react", "vue", "svelte"]) {
  test(`${renderer} follows X provider updates and clears resized iframe heights`, async ({
    page,
  }) => {
    // Use the real cross-origin message transport without depending on X's network service.
    await page.route("https://platform.twitter.com/**", (route) =>
      route.fulfill({
        contentType: "text/html",
        body: '<script>parent.postMessage({"twttr.embed":{"method":"twttr.private.resize","params":[{"width":550,"height":648}]}}, "*")</script>',
      }),
    );
    await page.route("https://open.spotify.com/**", (route) =>
      route.fulfill({ contentType: "text/html", body: "" }),
    );
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.setContent("<main></main>");
    await page.addScriptTag({ content: bundle });
    await page.evaluate(
      ({ renderer, spotify }) => {
        window.embedTest = window.EmbedTest.embed(
          renderer,
          document.querySelector("main")!,
          spotify,
        );
      },
      { renderer, spotify },
    );
    await expect(page.locator("iframe")).toHaveAttribute("src", spotify.src);
    expect(await page.evaluate(() => window.__comarkEmbed?.users ?? 0)).toBe(0);

    await page.evaluate((post) => window.embedTest.update(post), post);
    await expect(page.locator("iframe")).toHaveAttribute("src", post.src);
    await expect.poll(() => page.evaluate(() => window.__comarkEmbed?.users ?? 0)).toBe(1);
    await expect(page.locator("iframe")).toHaveCSS("height", "648px");

    await page.evaluate((spotify) => window.embedTest.update(spotify), spotify);
    await expect(page.locator("iframe")).toHaveAttribute("src", spotify.src);
    await expect.poll(() => page.evaluate(() => window.__comarkEmbed?.users ?? 0)).toBe(0);
    await expect(page.locator("iframe")).toHaveCSS("height", "152px");
    expect(await page.locator("iframe").evaluate((frame) => frame.style.height)).toBe("");

    await page.evaluate((post) => window.embedTest.update(post), post);
    await expect(page.locator("iframe")).toHaveCSS("height", "648px");
    // Replacing one post with another must also discard the old post's height.
    await page.route("https://platform.twitter.com/**", (route) =>
      route.fulfill({ contentType: "text/html", body: "" }),
    );
    await page.evaluate(
      (post) => window.embedTest.update({ ...post, src: post.src.replace("123", "456") }),
      post,
    );
    await expect(page.locator("iframe")).toHaveAttribute("src", post.src.replace("123", "456"));
    expect(await page.locator("iframe").evaluate((frame) => frame.style.height)).toBe("");
    await page.evaluate(() => window.embedTest.stop());
    await expect(page.locator("iframe")).toHaveCount(0);
    expect(await page.evaluate(() => window.__comarkEmbed?.users ?? 0)).toBe(0);
    expect(errors).toEqual([]);
  });
}
