import { createHtmlRenderer } from "@comark/html";
import { defineComarkPlugin, parseMarkdown } from "comark";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import icon, {
  components,
  createIcons,
  describeIconProblem,
  type IconCollection,
  type IconOptions,
  type Icons,
} from "../src/html.ts";

const lucide: IconCollection = {
  prefix: "lucide",
  width: 24,
  height: 24,
  icons: { apple: { body: '<path stroke="currentColor" d="M1 1h2"/>' } },
  aliases: { fruit: { parent: "apple" } },
};
const logos: IconCollection = {
  prefix: "logos",
  icons: { pnpm: { body: '<path fill="#f9ad00" d="M0 0h8v4H0z"/>', width: 32, height: 16 } },
};
const own: IconCollection = { mark: '<svg viewBox="0 0 10 10"><circle r="5"/></svg>' };
const collections = { lucide, logos, own, "simple-icons": logos };
const render = (markdown: string, options: IconOptions | Icons = { collections }) =>
  createHtmlRenderer({ plugins: [icon(options)], components })(markdown);
const issues = async (markdown: string, options: IconOptions = { collections }) =>
  (await parseMarkdown(markdown, { plugins: [icon(options)] })).meta.issues;
// Without the inline styles, and with the renderer's indenting collapsed.
const stripStyles = (html: string) =>
  html
    .replace(/<style[^>]*>.*?<\/style>/s, "")
    .replace(/\s+/g, " ")
    .replace(/<p> /g, "<p>")
    .replace(/ <\/p>/g, "</p>")
    .trim();

afterEach(() => vi.unstubAllGlobals());

describe("comark-icon", () => {
  it("draws a monochrome icon as a mask and a colored one as an image, with the styles once", async () => {
    const html = await render(
      'Ship :icon{name="lucide:apple"} with :icon{name="logos:pnpm"} and :icon{name="lucide:apple"}.',
    );
    expect(html.match(/<style data-comark-icon>/g)).toHaveLength(1);
    expect(stripStyles(html)).toMatch(
      /^<p>Ship <span class="ci" data-mask aria-hidden="true" style="--ci:url\(&quot;data:image\/svg\+xml,%3Csvg xmlns='http:\/\/www.w3.org\/2000\/svg' viewBox='0 0 24 24'%3E%3Cpath stroke='currentColor' d='M1 1h2'\/%3E%3C\/svg%3E&quot;\)"><\/span> with <span class="ci" aria-hidden="true" style="--ci:url\(&quot;data:image\/svg\+xml,[^"]*%23f9ad00[^"]*&quot;\);--ci-ratio:2"><\/span> and <span class="ci" data-mask/,
    );
  });

  it("announces an icon with a label, and leaves one without as decoration", async () => {
    const html = stripStyles(await render(':icon{name="lucide:apple" label="Apple"}'));
    expect(html).toContain('<span class="ci" data-mask role="img" aria-label="Apple" style=');
    expect(html).not.toContain("aria-hidden");
  });

  it("reads Nuxt UI's names, aliases, your own SVGs, image URLs, and bound names", async () => {
    const html = stripStyles(
      await render(
        '---\nfruit: lucide:fruit\n---\n:icon{name="i-lucide-apple"} :icon{name="i-lucide:apple"} :icon{name="i-simple-icons-pnpm"} :icon{:name="frontmatter.fruit"} :icon{name="own:mark"} :icon{name="/logo.svg"} :icon{name="https://x.dev/a b.svg"}',
      ),
    );
    expect(html.match(/data-mask/g)).toHaveLength(3);
    expect(html.match(/--ci-ratio:2/g)).toHaveLength(1);
    expect(html).toContain("%3Ccircle r='5'/%3E");
    expect(html).toContain('style="--ci:url(&quot;/logo.svg&quot;)"');
    expect(html).toContain("--ci:url(&quot;https://x.dev/a%20b.svg&quot;)");
  });

  it("keeps the name and the drawn icon in the tree, for other renderers", async () => {
    const { nodes } = await parseMarkdown(':icon{name="logos:pnpm" label="pnpm"}', {
      plugins: [icon({ collections })],
    });
    expect(nodes).toEqual([
      [
        "icon",
        {
          name: "logos:pnpm",
          src: expect.stringMatching(/^data:image\/svg\+xml,/),
          ratio: "2",
          label: "pnpm",
        },
      ],
    ]);
  });

  it("fetches sets it doesn't have from the Iconify API, once per icon, in sorted batches", async () => {
    const fetch = vi.fn(async (url: string) => {
      const names = new URL(url).searchParams.get("icons")?.split(",") ?? [];
      return new Response(
        JSON.stringify({
          prefix: "mdi",
          icons: Object.fromEntries(names.map((name) => [name, { body: "<g/>" }])),
        }),
      );
    });
    vi.stubGlobal("fetch", fetch);
    const many = Array.from(
      { length: 60 },
      (_, at) => `:icon{name="mdi:icon-${String(at).padStart(2, "0")}"}`,
    ).join(" ");
    expect(await issues(`:icon{name="mdi:zeta"} :icon{name="mdi:alpha"} ${many}`, {})).toEqual([]);
    expect(await issues(':icon{name="mdi:alpha"}', {})).toEqual([]);
    const urls = fetch.mock.calls.map(([url]) => url);
    expect(urls.length).toBeGreaterThan(1);
    expect(urls.every((url) => url.length < 500)).toBe(true);
    expect(urls[0]).toMatch(/^https:\/\/api\.iconify\.design\/mdi\.json\?icons=alpha,icon-00,/);
    expect(
      new Set(urls.flatMap((url) => new URL(url).searchParams.get("icons")?.split(","))),
    ).toHaveProperty("size", 62);
  });

  it("asks an API of your own, or none", async () => {
    const fetch = vi.fn(
      async () => new Response(JSON.stringify({ prefix: "ph", icons: { x: { body: "<g/>" } } })),
    );
    vi.stubGlobal("fetch", fetch);
    expect(await issues(':icon{name="ph:x"}', { fetch: "https://icons.example.com/" })).toEqual([]);
    expect(fetch).toHaveBeenCalledWith(
      "https://icons.example.com/ph.json?icons=x",
      expect.anything(),
    );
    expect(await issues(':icon{name="tabler:x"}', { fetch: false })).toEqual([
      '`:icon` 1 ("tabler:x"): There\'s no icon set `tabler` to draw `tabler:x` from. Find a set at https://icones.js.org, or pass `tabler` in `collections`.',
    ]);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("reports icons it can't draw, naming each and the fix, and leaves them out", async () => {
    vi.stubGlobal("fetch", async (url: string) =>
      url.includes("/down.") ? new Response("", { status: 503 }) : new Response("404"),
    );
    const markdown =
      'A :icon{name="lucide:aple"} B :icon{name="apple"} C :icon{name="gone:x"} D :icon{name="down:x"} E :icon{name="lucide:apple:extra"} F :icon';
    expect(stripStyles(await render(markdown))).toBe("<p>A B C D E F</p>");
    expect(await issues(markdown)).toEqual([
      '`:icon` 1 ("lucide:aple"): The `lucide` set has no icon `aple`. Find its name at https://icones.js.org/collection/lucide.',
      '`:icon` 2 ("apple"): "apple" isn\'t an icon name. Write it as `set:name`, such as `lucide:apple`, or give an image URL.',
      '`:icon` 3 ("gone:x"): There\'s no icon set `gone` to draw `gone:x` from. Find a set at https://icones.js.org, or pass `gone` in `collections`.',
      '`:icon` 4 ("down:x"): Couldn\'t load `down:x` from Iconify (HTTP 503). Install `@iconify-json/down` and pass it in `collections`, or try again.',
      '`:icon` 5 ("lucide:apple:extra"): "lucide:apple:extra" isn\'t an icon name. Write it as `set:name`, such as `lucide:apple`, or give an image URL.',
      '`:icon` 6: `name` is required. Write `:icon{name="lucide:apple"}`.',
    ]);
  });

  it("names each issue's rule in meta.issueRules", async () => {
    vi.stubGlobal("fetch", async (url: string) =>
      url.includes("/down.") ? new Response("", { status: 503 }) : new Response("404"),
    );
    const { meta } = await parseMarkdown(
      ':icon{name="lucide:aple"} :icon{name="apple"} :icon{name="gone:x"} :icon{name="down:x"} :icon :icon{name="lucide:apple" alt="Apple"}',
      { plugins: [icon({ collections })] },
    );
    expect(meta.issues.map((issue: string) => meta.issueRules[issue])).toEqual([
      "comark/icon/unknown-icon",
      "comark/icon/invalid-name",
      "comark/icon/unknown-set",
      "comark/icon/download-failed",
      "comark/icon/missing-name",
      "comark/icon/unknown-prop",
    ]);
    expect(meta.issues.at(-1)).toBe(
      "`:icon` 6: `alt` isn't a prop of `:icon`, so it's ignored. Use `name` or `label`.",
    );
  });

  it("adds its issues to the ones other plugins found", async () => {
    const before = defineComarkPlugin(() => ({
      name: "before",
      post(state) {
        state.tree.meta.issues = ["An earlier plugin's issue."];
      },
    }));
    const document = await parseMarkdown(':icon{name="nope"}', { plugins: [before(), icon()] });
    expect(document.meta.issues).toHaveLength(2);
    expect(document.meta.issues[0]).toBe("An earlier plugin's issue.");
  });

  it("shares one resolver between plugins, for theirs to draw and describe", async () => {
    const icons = createIcons({ collections });
    const resolved = await icons.resolve(["lucide:fruit", "lucide:nope", "./a.png"]);
    expect(resolved.get("lucide:fruit")).toMatchObject({
      name: "lucide:fruit",
      ratio: 1,
      mask: true,
    });
    expect(resolved.get("./a.png")).toEqual({
      name: "./a.png",
      src: "./a.png",
      ratio: 1,
      mask: false,
    });
    const problem = resolved.get("lucide:nope");
    expect(problem && "problem" in problem && describeIconProblem("lucide:nope", problem)).toBe(
      "The `lucide` set has no icon `nope`. Find its name at https://icones.js.org/collection/lucide.",
    );
    expect(await render(':icon{name="logos:pnpm"}', icons)).toContain('class="ci"');
  });
});
