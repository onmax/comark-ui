import { createHtmlRenderer } from "@comark/html";
import { fetchPost, postMarkdown } from "comark-social";
import { afterEach, expect, it, vi } from "vite-plus/test";
import html, { type PresetOptions } from "../src/html.ts";

// postMarkdown() is written for documents rendered with every comark-ui plugin on, as Drop renders them, so text that
// one of them reads as syntax must still come back as the card fetching draws.
const X = "https://x.com/ada/status/1856000000000000000";
const offline: PresetOptions = {
  chips: { download: false },
  badge: { download: false },
  icon: { fetch: false },
  diagrams: { draw: false },
};
const social = { now: "2026-11-28T12:00:00Z", timeZone: "UTC" };

afterEach(() => vi.unstubAllGlobals());

it.each([
  "$x$ $$y$$ \\(z\\) \\[w\\] [a+b] (c^2) \\\\[d+e\\\\] and $5",
  "==mark== ^sup^ H~2~O ++ctrl+k++ C++",
  "{++add++} {--gone--} {~~a~>b~~} {==hi==}{>>note<<}",
  "a note[^1] and :cite[1] and :time[2026-11-02] and :icon[x] and :qr{value=x}",
  "Term\n: definition\n> [!NOTE]\n!!! note",
  ":::details\n::code-group\n```mermaid\ngraph TD\n```",
  "@ada and #123 and onmax/comark-ui#5 and `#fff` and https://github.com/onmax",
  "**bold**, *em*, ~~del~~, <kbd>K</kbd>, &copy;, 日本語の**強調**です。",
])("writes text comark-ui reads back as the same card: %j", async (text) => {
  const answer = {
    tweet: { url: X, id: "1856000000000000000", text, author: { screen_name: "ada", name: "Ada" } },
  };
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify(answer))),
  );
  // A request of its own skips fetchPost()'s per-process cache, which would keep the first answer.
  const request = (url: URL, init: RequestInit) => globalThis.fetch(url, init);
  const render = async (markdown: string, fetch: boolean) =>
    (
      await createHtmlRenderer(html({ ...offline, social: { ...social, fetch, request } }))(
        markdown,
      )
    )
      .replace(/<(script|style)\b.*?<\/\1>/gs, "")
      .trim();
  const post = await fetchPost(X, { request });
  expect(post.text).toBe(text);
  const markdown = await postMarkdown(post);
  expect(await render(markdown, false), markdown).toBe(
    await render(`::post{url="${X}"}\n::`, true),
  );
});
