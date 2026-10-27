import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { createHtmlRenderer } from "@comark/html";
import { parseMarkdown } from "comark";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import chips, { type ChipsOptions, components } from "../src/html.ts";

const PNG = new Uint8Array([137, 80, 78, 71]);
const requests: string[] = [];

// A web with a favicon for every site, an avatar for `onmax`, no account `ghost`, no network for `offline.dev`, and an
// unavatar.io that has had enough of `busy`.
beforeEach(() => {
  requests.length = 0;
  vi.stubGlobal("fetch", async (input: string) => {
    requests.push(input);
    if (input.includes("offline.dev")) throw new TypeError("fetch failed");
    if (input.includes("/ghost")) return new Response("Not Found", { status: 404 });
    if (input.includes("/busy")) return new Response("Too Many Requests", { status: 429 });
    return new Response(PNG, { headers: { "content-type": "image/png" } });
  });
});
afterEach(() => vi.unstubAllGlobals());

// Images are kept in memory only, so no run of the tests reads what another left on disk.
const render = (markdown: string, options?: ChipsOptions) =>
  createHtmlRenderer({ plugins: [chips({ cache: false, ...options })], components })(markdown);
const issues = async (markdown: string, options?: ChipsOptions) =>
  (await parseMarkdown(markdown, { plugins: [chips({ cache: false, ...options })] })).meta.issues;
const DATA = "data:image/png;base64,iVBORw==";

describe("comark-chips", () => {
  it("turns a link into a chip with the site's favicon inlined, and the styles once", async () => {
    const html = await render("Built with [Vite](https://vite.dev) and [Vue](https://vuejs.org).");
    expect(html).toContain(
      `<a class="cp" href="https://vite.dev" data-kind="favicon"><img class="cp-img" src="${DATA}" alt="">Vite</a>`,
    );
    expect(html).toContain('href="https://vuejs.org"');
    expect(html.match(/<style data-comark-chips>/g)).toHaveLength(1);
    expect(requests).toContain("https://www.google.com/s2/favicons?domain=vite.dev&sz=64");
  });

  // Prose styles give every image a top margin, and outside a paragraph, as in a list item, nothing takes it back.
  it("sets every margin of the image, so a prose style's image margin can't push it below the text", async () => {
    const html = await render("- Listed on [Vite](https://vite.dev).");
    expect(html).toMatch(/\.cp-img\{[^}]*margin:0 \.3125em 0 0;/);
  });

  // Rendered without their parent, comark took the label's `<code>` for a block and wrote a newline after it.
  it("keeps code in a chip's label inline, with no space after it", async () => {
    const html = await render("On [commit `5b5bd21`](https://vite.dev), built.");
    expect(html).toContain(`alt="">commit <code>5b5bd21</code></a>, built.`);
  });

  it("turns @user into a chip with their GitHub avatar, and a link into an account shows it too", async () => {
    const html = await render(
      "Thanks @onmax, see [the repo](https://github.com/onmax/comark-ui) and [issues](https://github.com/issues).",
    );
    expect(html).toContain(
      `<a class="cp" href="https://github.com/onmax" data-kind="avatar"><img class="cp-img" src="${DATA}" alt="">onmax</a>,`,
    );
    expect(html).toContain(
      `<a class="cp" href="https://github.com/onmax/comark-ui" data-kind="avatar">`,
    );
    expect(html).toMatch(/href="https:\/\/github.com\/issues" data-kind="favicon"/);
    expect(requests).toContain("https://github.com/onmax.png?size=64");
  });

  it("leaves emails, npm scopes, code, relative links, and links around images alone", async () => {
    const html = await render(
      "Mail me@onmax.dev about `@onmax` and @comark/html, read the [guide](/guide/), see [![logo](https://x.dev/a.png)](https://x.dev).",
    );
    expect(html).not.toContain('class="cp"');
    expect(requests).toEqual([]);
  });

  it("shows a bare URL without its scheme, and an @user link without its @", async () => {
    const html = await render("<https://vite.dev/guide/> by [@onmax](https://github.com/onmax)");
    expect(html).toMatch(/alt="">vite\.dev\/guide<\/a>/);
    expect(html).toMatch(/alt="">onmax<\/a>/);
  });

  it("takes an avatar from the link, keeps a plain link on request, and keeps the title", async () => {
    const html = await render(
      '[Anthony](https://antfu.me "His site"){avatar="@antfu"}, [logo](https://nuxt.com){avatar="https://x.dev/n.png"}, and [plain](https://vite.dev){chip=false}',
    );
    expect(html).toContain(
      '<a class="cp" href="https://antfu.me" data-kind="avatar" title="His site">',
    );
    expect(html).toContain('href="https://nuxt.com" data-kind="avatar"');
    expect(html).toMatch(/<a href="https:\/\/vite.dev">plain<\/a>/);
    expect(requests).toEqual(
      expect.arrayContaining(["https://github.com/antfu.png?size=64", "https://x.dev/n.png"]),
    );
  });

  it("preserves malformed web destinations instead of throwing", async () => {
    const html = await render("[broken](https://)");
    expect(html).toContain('<a href="https://">broken</a>');
    expect(html).not.toContain('class="cp"');
    expect(await issues("[broken](https://)")).toEqual([
      "[broken](https://): `href` must be a valid web address.",
    ]);
  });

  it("does not nest chips when a link wraps an explicit chip", async () => {
    const html = await render('[:chip[y]{href="https://y.dev"}](https://x.dev)');
    expect(html.match(/<a/g)).toHaveLength(1);
    expect(html).toContain('href="https://x.dev"');
    expect(html).toContain(">y</span>");
  });

  it("leaves raw HTML subtrees unchanged", async () => {
    const html = await render("<span>@onmax</span> and @onmax");
    expect(html).toContain("<span>@onmax</span>");
    expect(html.match(/<a class="cp"[^>]*data-kind="avatar"/g)).toHaveLength(1);
  });

  it("draws an inline :chip like a link", async () => {
    const html = await render(':chip[Nuxt]{href="https://nuxt.com"}');
    expect(html).toContain('<a class="cp" href="https://nuxt.com" data-kind="favicon"><img');
    expect(await issues(":chip[Nuxt]")).toEqual([
      '`:chip` [Nuxt](): `href` must be a web address, such as `href="https://vite.dev"`.',
    ]);
  });

  it("leaves an image the browser can't download to the reader, and reports an avatar that doesn't exist", async () => {
    const html = await render("[Offline](https://offline.dev) and @ghost");
    expect(html).toContain(
      'src="https://www.google.com/s2/favicons?domain=offline.dev&amp;sz=64" alt="">Offline</a>',
    );
    expect(html).toMatch(/href="https:\/\/github.com\/ghost" data-kind="avatar">ghost<\/a>/);
    expect(await issues("@ghost")).toEqual([
      "`@ghost`: there's no avatar at https://github.com/ghost.png?size=64 (HTTP 404). Check the GitHub login, or set `avatar` to an image URL.",
    ]);
  });

  it("takes other image sources, and keeps URLs without downloading", async () => {
    const html = await render("[Vite](https://vite.dev) by @onmax", {
      download: false,
      favicon: (host) => `https://icons.example/${host}.ico`,
      avatar: (login) => `https://unavatar.io/github/${login}`,
    });
    expect(html).toContain('src="https://icons.example/vite.dev.ico"');
    expect(html).toContain('src="https://unavatar.io/github/onmax"');
    expect(requests).toEqual([]);
  });

  it("shows the avatar of an X, Bluesky, YouTube, or GitLab account through unavatar.io", async () => {
    const html = await render(
      "[@youyuxi](https://x.com/youyuxi/status/1), [Paul](https://bsky.app/profile/pfrazee.com), [MKBHD](https://www.youtube.com/@mkbhd), [GitLab](https://gitlab.com/gitlab-org), and [search](https://x.com/search).",
    );
    expect(html).toContain(
      `<a class="cp" href="https://x.com/youyuxi/status/1" data-kind="avatar"><img class="cp-img" src="${DATA}" alt="">youyuxi</a>`,
    );
    expect(html).toMatch(/href="https:\/\/x.com\/search" data-kind="favicon"/);
    expect(requests).toEqual(
      expect.arrayContaining([
        "https://unavatar.io/x/youyuxi?fallback=false",
        "https://unavatar.io/bluesky/pfrazee.com?fallback=false",
        "https://unavatar.io/youtube/mkbhd?fallback=false",
        "https://unavatar.io/gitlab/gitlab-org?fallback=false",
      ]),
    );
  });

  it("leaves malformed social profile paths as favicon chips", async () => {
    await render(
      "[bad Bluesky](https://bsky.app/profile/not_a_handle), [bad Bluesky](https://bsky.app/profile/-name), [bad Bluesky](https://bsky.app/profile/example), [bad Bluesky](https://bsky.app/profile/example.8), [bad YouTube](https://youtube.com/@a), [bad YouTube](https://youtube.com/@-channel), [bad YouTube](https://youtube.com/@channel.), [bad GitLab](https://gitlab.com/a), and [bad GitLab](https://gitlab.com/.name).",
    );
    expect(requests).not.toEqual(
      expect.arrayContaining([
        "https://unavatar.io/bluesky/not_a_handle?fallback=false",
        "https://unavatar.io/bluesky/-name?fallback=false",
        "https://unavatar.io/bluesky/example?fallback=false",
        "https://unavatar.io/bluesky/example.8?fallback=false",
        "https://unavatar.io/youtube/a?fallback=false",
        "https://unavatar.io/youtube/-channel?fallback=false",
        "https://unavatar.io/youtube/channel.?fallback=false",
        "https://unavatar.io/gitlab/a?fallback=false",
        "https://unavatar.io/gitlab/.name?fallback=false",
      ]),
    );
  });

  it("takes an account on any network unavatar.io knows from `avatar`, and reports one that doesn't exist", async () => {
    const html = await render('[Sindre](https://sindresorhus.com){avatar="mastodon:sindre"}');
    expect(html).toContain('href="https://sindresorhus.com" data-kind="avatar"><img');
    expect(requests).toContain("https://unavatar.io/mastodon/sindre?fallback=false");
    expect(await issues("[Ghost](https://bsky.app/profile/ghost.bsky.social)")).toEqual([
      "[Ghost](https://bsky.app/profile/ghost.bsky.social): there's no avatar at https://unavatar.io/bluesky/ghost.bsky.social?fallback=false (HTTP 404). Check the Bluesky handle, or set `avatar` to an image URL.",
    ]);
  });

  it("accepts hyphenated providers and preserves federated handles", async () => {
    await render(
      '[Music](https://example.com){avatar="apple-music:artist"} and [Masto](https://example.com/masto){avatar="mastodon:sindre@example.social"}',
    );
    expect(requests).toEqual(
      expect.arrayContaining([
        "https://unavatar.io/apple-music/artist?fallback=false",
        "https://unavatar.io/mastodon/sindre%40example.social?fallback=false",
      ]),
    );
  });

  it("leaves a rate-limited image to the reader's browser and says to build again", async () => {
    const html = await render("[Busy](https://x.com/busy)");
    expect(html).toContain('src="https://unavatar.io/x/busy?fallback=false" alt="">Busy</a>');
    expect(await issues("[Busy](https://x.com/busy)")).toEqual([
      "[Busy](https://x.com/busy): unavatar.io turned the download away for now (HTTP 429), so readers' browsers load the image. Build again later; once downloaded, it's cached for a week.",
    ]);
  });

  it("reports an avatar written as a bare login, and names each issue's rule in meta.issueRules", async () => {
    const { meta } = await parseMarkdown(
      ':chip[Nuxt]\n\n@ghost and [Busy](https://x.com/busy)\n\n[Mona](https://example.com){avatar="octocat"}',
      { plugins: [chips({ cache: false })] },
    );
    expect(meta.issues).toContain(
      '[Mona](https://example.com): `avatar="octocat"` is neither an image URL nor an account, so the chip shows a broken image. Write `avatar="@octocat"` for a GitHub account, or `avatar="https://…"` for an image.',
    );
    expect(meta.issues.map((issue) => meta.issueRules[issue]).sort()).toEqual([
      "comark/chips/invalid-avatar",
      "comark/chips/invalid-href",
      "comark/chips/missing-avatar",
      "comark/chips/rate-limited",
    ]);
    expect(await issues('[Mona](https://example.com){avatar="/mona.png"}')).toEqual([]);
  });

  it("keeps downloaded images in the cache folder for the next build", async () => {
    const parent = join(import.meta.dirname, "../node_modules/.cache");
    await mkdir(parent, { recursive: true });
    const folder = await mkdtemp(join(parent, "comark-chips-test-"));
    try {
      await render("[Cached](https://cached.dev)", { cache: folder });
      // A new module is a new build: nothing is left in memory.
      vi.resetModules();
      const next = await import("../src/html.ts");
      requests.length = 0;
      const html = await createHtmlRenderer({
        plugins: [next.default({ cache: folder })],
        components: next.components,
      })("[Cached](https://cached.dev)");
      expect(html).toContain(`src="${DATA}" alt="">Cached</a>`);
      expect(requests).toEqual([]);
    } finally {
      await rm(folder, { recursive: true, force: true });
    }
  });
});
