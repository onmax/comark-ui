import { createHtmlRenderer } from "@comark/html";
import { defineComarkPlugin, parseMarkdown } from "comark";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { createIcons, type IconCollection } from "comark-icon";
import tabs, { components, type TabsOptions } from "../src/html.ts";

const render = (markdown: string) =>
  createHtmlRenderer({ plugins: [tabs()], components })(markdown);
const issues = async (markdown: string) =>
  (await parseMarkdown(markdown, { plugins: [tabs()] })).meta.issues;
// Without the inline styles and script, whose source mentions attributes of its own.
const markup = async (markdown: string) =>
  (await render(markdown)).replace(/<style[^>]*>.*?<\/style><script>.*?<\/script>/s, "");

const os =
  '::tabs{sync="os"}\n:::tabs-item{label="macOS"}\nPress **⌘K**.\n:::\n\n:::tabs-item{label="Windows"}\nPress Ctrl+K.\n:::\n::';
const pm =
  '::code-group{sync="pm"}\n```bash [pnpm]\npnpm add x\n```\n\n```bash [npm]\nnpm i x\n```\n::';

describe("comark-tabs", () => {
  it("renders a tab strip and panels with WAI-ARIA tabs markup", async () => {
    const html = await render(os);
    const [, id] = /id="(ct-[a-z0-9]+-1)-tab-1"/.exec(html) ?? [];
    expect(html).toContain(
      '<div class="ct" data-tabs-sync="os"><div class="ct-list" role="tablist">' +
        `<button type="button" class="ct-tab" role="tab" id="${id}-tab-1" aria-controls="${id}-panel-1" aria-selected="true" tabindex="0">macOS</button>` +
        `<button type="button" class="ct-tab" role="tab" id="${id}-tab-2" aria-controls="${id}-panel-2" aria-selected="false" tabindex="-1">Windows</button></div>`,
    );
    expect(html).toContain(
      `<div class="ct-panel" role="tabpanel" id="${id}-panel-1" aria-labelledby="${id}-tab-1" tabindex="0"><div class="ct-caption">macOS</div>`,
    );
    // Without the script every panel shows, so none of them is `hidden`.
    expect(html).toContain(
      `<div class="ct-panel" role="tabpanel" id="${id}-panel-2" aria-labelledby="${id}-tab-2" tabindex="0" data-inactive><div class="ct-caption">Windows</div>`,
    );
    expect(await markup(os)).not.toContain("hidden");
    expect(html).toContain("<strong>⌘K</strong>");
    expect(html.match(/<script>/g)).toHaveLength(1);
  });

  it("inlines styles a site can theme with --ct-* variables, with today's look as the fallback", async () => {
    const style = /<style data-comark-tabs>(.*?)<\/style>/s.exec(await render(os))?.[1];
    for (const variable of [
      "background:var(--ct-surface,color-mix(",
      "background:var(--ct-active,var(--_comark-background))",
      "background:var(--ct-active,oklch(from var(--_comark-background) ",
      "color:var(--ct-active-text,var(--_comark-foreground))",
      "margin-top:var(--ct-gap,.75rem)",
      "font:500 var(--ct-font-size,.8125rem)/",
    ])
      expect(style).toContain(variable);
  });

  it("numbers the ids of every block in a document, the same on every render, and inlines the script once", async () => {
    const html = await markup(`${os}\n\n${os}`);
    expect(html).toMatch(/id="ct-[a-z0-9]+-1-tab-1"/);
    expect(html).toMatch(/id="ct-[a-z0-9]+-2-tab-1"/);
    expect(await markup(`${os}\n\n${os}`)).toBe(html);
    expect((await render(`${os}\n\n${os}`)).match(/<script>/g)).toHaveLength(1);
  });

  it("keeps the ids of two documents on one page apart, and apart from the author's", async () => {
    const page = (
      await Promise.all([os, `# Setup {#ct-1-tab-1}\n\n${os}\n\n${pm}`].map(markup))
    ).join("");
    const ids = [...page.matchAll(/ id="([^"]+)"/g)].map(([, id]) => id);
    expect(ids).toContain("ct-1-tab-1");
    expect(ids.length).toBeGreaterThan(12);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("turns a code group into tabs labelled by each block's filename", async () => {
    const html = await markup(pm);
    expect(html).toContain('<div class="ct" data-tabs-code data-tabs-sync="pm">');
    expect(html).toContain('aria-selected="true" tabindex="0">pnpm</button>');
    expect(html).toContain('aria-selected="false" tabindex="-1">npm</button>');
    expect(html).toContain('<div class="ct-caption">npm</div><pre data-language="bash">');
    // The tab names the block, so the block's own chrome doesn't repeat it.
    expect(html).not.toContain("filename");
  });

  it("keeps tabs inside a tab apart", async () => {
    const html = await markup(
      '::tabs\n:::tabs-item{label="Outer"}\n::::tabs\n:::::tabs-item{label="Inner"}\nIn\n:::::\n::::\n:::\n::',
    );
    expect(html).toMatch(/id="ct-[a-z0-9]+-1-tab-1"/);
    expect(html).toMatch(/id="ct-[a-z0-9]+-2-tab-1"/);
    expect(html.match(/class="ct-list"/g)).toHaveLength(2);
  });

  it("falls back to a label it can show, and skips comments", async () => {
    const html = await markup(
      "::tabs\n:::tabs-item\nOne\n:::\n\n<!-- a note -->\n::\n\n::code-group\n```ts\nconst a = 1\n```\n\n```\nplain\n```\n::",
    );
    expect(html).toContain(">Tab 1</button>");
    expect(html.match(/role="tabpanel"/g)).toHaveLength(3);
    expect(html).toContain(">ts</button>");
    expect(html).toContain(">Code 2</button>");
  });

  it("renders a tab outside tabs as plain content", async () => {
    const html = await render(':::tabs-item{label="Lost"}\nOne\n:::');
    expect(html).toMatch(/^<div>\s*One\s*<\/div>/);
    expect(html).not.toMatch(/ct-|undefined/);
  });

  it("reports problems in meta.issues, naming the block and the fix", async () => {
    expect(await issues(`${os}\n\n${pm}`)).toEqual([]);
    expect(
      await issues(
        '::tabs\n:::tabs-item{label="A"}\nA\n:::\n::\n\n::tabs\n:::tabs-item{label="A"}\nA\n:::\n\n:::tabs-item{label="B"}\nB\n:::\n\n:::tabs-item\nC\n:::\n::',
      ),
    ).toEqual(['`::tabs` 2, tab 3: `label` is required. Write `:::tabs-item{label="..."}`.']);
    expect(await issues('::tabs\n:::tabs-item{label="A"}\nA\n:::\n\nStray text\n::')).toEqual([
      '`::tabs` 1: put each tab in `:::tabs-item{label="..."}`. Found the paragraph "Stray text" outside a tab, so it doesn\'t render.',
    ]);
    expect(await issues("::code-group\n```bash [pnpm]\na\n```\n\n```bash\nb\n```\n::")).toEqual([
      "`::code-group` 1, block 2: a code block needs a label. Put it in brackets after the language: ```bash [npm].",
    ]);
    expect(await issues("::code-group\n```bash [pnpm]\na\n```\n\nSome text\n::")).toEqual([
      '`::code-group` 1: only code blocks go inside. Move the paragraph "Some text" out, or use `::tabs`.',
    ]);
    expect(
      await issues(
        '::tabs\n:::tabs-item{label="npm"}\na\n:::\n\n:::tabs-item{label="npm"}\nb\n:::\n::',
      ),
    ).toEqual([
      '`::tabs` 1: two tabs are labelled "npm". Labels must differ, because `sync` matches tabs by label.',
    ]);
    expect(await issues("::tabs\n::\n\n::code-group\n::")).toEqual([
      '`::tabs` 1 has no tabs. Put `:::tabs-item{label="..."}` blocks inside it, or remove it.',
      "`::code-group` 1 has no code blocks. Put fenced code blocks inside it, or remove it.",
    ]);
    expect(await issues(':::tabs-item{label="Lost"}\nOne\n:::')).toEqual([
      '`:::tabs-item` 1 ("Lost") sits outside `::tabs`, so it renders as plain content. Wrap it in `::tabs`, or remove the `:::tabs-item` fence.',
    ]);
  });

  it("names each issue's rule in meta.issueRules, with comark-icon's for icons", async () => {
    const { meta } = await parseMarkdown(
      '::tabs{sycn="os"}\nStray\n\n:::tabs-item{label="A" icon="lucide apple"}\nA\n:::\n\n:::tabs-item{label="A"}\nB\n:::\n::\n\n:::tabs-item\nC\n:::',
      { plugins: [tabs({ iconResolver: createIcons({ fetch: false }) })] },
    );
    expect(meta.issues.map((issue: string) => meta.issueRules[issue])).toEqual([
      "comark/tabs/unknown-prop",
      "comark/tabs/content-outside-tab",
      "comark/tabs/duplicate-label",
      "comark/tabs/stray-tabs-item",
      "comark/icon/invalid-name",
    ]);
    expect(meta.issues[0]).toBe(
      "`::tabs` 1: `sycn` isn't a prop of `::tabs`, so it's ignored. Use `sync`.",
    );
  });

  it("reads bound labels and sync from the front matter", async () => {
    const html = await markup(
      '---\nkey: os\nname: Linux\n---\n::tabs{:sync="frontmatter.key"}\n:::tabs-item{:label="frontmatter.name"}\nOne\n:::\n::',
    );
    expect(html).toContain('data-tabs-sync="os"');
    expect(html).toContain(">Linux</button>");
  });

  it("adds its issues to the ones other plugins found", async () => {
    const before = defineComarkPlugin(() => ({
      name: "before",
      post(state) {
        state.tree.meta.issues = ["An earlier plugin's issue."];
      },
    }));
    const document = await parseMarkdown("::tabs\n::", { plugins: [before(), tabs()] });
    expect(document.meta.issues).toHaveLength(2);
    expect(document.meta.issues[0]).toBe("An earlier plugin's issue.");
  });

  describe("pm", () => {
    const panels = async (markdown: string, options?: TabsOptions) => {
      const html = (
        await createHtmlRenderer({ plugins: [tabs(options)], components })(markdown)
      ).replace(/<style[^>]*>.*?<\/style><script>.*?<\/script>/s, "");
      return [
        ...html.matchAll(
          /<div class="ct-caption">([^<]+)<\/div><pre[^>]*><code[^>]*>(.*?)<\/code>/gs,
        ),
      ].map(([, label, code]) => [label, code]);
    };
    const all: TabsOptions = { managers: ["npm", "pnpm", "yarn", "bun", "deno"] };

    it("turns a code block into a code group with a tab per package manager, synced with `pm`", async () => {
      const markdown = "```sh pm\nnpm i -D vitest\ncd my-npm-app && npm run dev\n```";
      const html = await markup(markdown);
      expect(html).toContain('<div class="ct" data-tabs-code data-tabs-sync="pm">');
      expect(
        [...html.matchAll(/role="tab"[^>]*>([^<]+)<\/button>/g)].map(([, label]) => label),
      ).toEqual(["npm", "pnpm", "yarn", "bun"]);
      expect(await panels(markdown)).toEqual([
        ["npm", "npm i -D vitest\ncd my-npm-app && npm run dev"],
        ["pnpm", "pnpm add -D vitest\ncd my-npm-app && pnpm run dev"],
        ["yarn", "yarn add -D vitest\ncd my-npm-app && yarn dev"],
        ["bun", "bun add -d vitest\ncd my-npm-app && bun run dev"],
      ]);
      expect(html).not.toMatch(/<pre[^>]*\bpm\b/);
      expect(await issues(markdown)).toEqual([]);
    });

    it("reads a command in any manager and writes it in every one, keeping the author's own as written", async () => {
      const markdown = [
        "```sh pm",
        "yarn",
        "pnpm install --frozen-lockfile",
        "yarn add -D vitest",
        "bun remove left-pad",
        "pnpm update vitest",
        "deno task dev --port 3000",
        "pnpm test",
        "pnpx nuxi@latest module add ui",
        "bunx prettier --write .",
        "yarn create astro --template starlight",
        "npm init vue@latest",
        "```",
      ].join("\n");
      expect(Object.fromEntries(await panels(markdown, all))).toEqual({
        npm: [
          "npm install",
          "npm ci",
          "npm install -D vitest",
          "npm uninstall left-pad",
          "npm update vitest",
          "npm run dev -- --port 3000",
          "npm run test",
          "npx nuxi@latest module add ui",
          "npx prettier --write .",
          "npm create astro@latest -- --template starlight",
          "npm init vue@latest",
        ].join("\n"),
        pnpm: [
          "pnpm install",
          "pnpm install --frozen-lockfile",
          "pnpm add -D vitest",
          "pnpm remove left-pad",
          "pnpm update vitest",
          "pnpm run dev --port 3000",
          "pnpm test",
          "pnpx nuxi@latest module add ui",
          "pnpm dlx prettier --write .",
          "pnpm create astro --template starlight",
          "pnpm create vue",
        ].join("\n"),
        yarn: [
          "yarn",
          "yarn install --immutable",
          "yarn add -D vitest",
          "yarn remove left-pad",
          "yarn up vitest",
          "yarn dev --port 3000",
          "yarn test",
          "yarn dlx nuxi@latest module add ui",
          "yarn dlx prettier --write .",
          "yarn create astro --template starlight",
          "yarn create vue",
        ].join("\n"),
        bun: [
          "bun install",
          "bun install --frozen-lockfile",
          "bun add -d vitest",
          "bun remove left-pad",
          "bun update vitest",
          "bun run dev --port 3000",
          "bun run test",
          "bunx nuxi@latest module add ui",
          "bunx prettier --write .",
          "bun create astro --template starlight",
          "bun create vue",
        ].join("\n"),
        deno: [
          "deno install",
          "deno install --frozen",
          "deno add -D npm:vitest",
          "deno remove npm:left-pad",
          "deno outdated --update vitest",
          "deno task dev --port 3000",
          "deno task test",
          "deno run -A npm:nuxi@latest module add ui",
          "deno run -A npm:prettier --write .",
          "deno init --npm astro --template starlight",
          "deno init --npm vue",
        ].join("\n"),
      });
    });

    it("writes each kind of dependency in every manager's flag", async () => {
      expect(
        await panels(
          "```sh pm\nnpm install --save-exact --save-peer react\nnpm i -O fsevents\n```",
          {
            managers: ["pnpm", "yarn", "bun"],
          },
        ),
      ).toEqual([
        ["pnpm", "pnpm add -E --save-peer react\npnpm add -O fsevents"],
        ["yarn", "yarn add -E --peer react\nyarn add --optional fsevents"],
        ["bun", "bun add --exact --peer react\nbun add --optional fsevents"],
      ]);
    });

    it("leaves lines that don't start with a manager alone", async () => {
      expect(
        await panels("```sh pm\necho npm install\nNODE_ENV=1 npm test; bun dev\n```", {
          managers: ["npm"],
        }),
      ).toEqual([["npm", "echo npm install\nNODE_ENV=1 npm test; npm run dev"]]);
    });

    it("preserves separators inside quoted arguments", async () => {
      const markdown = '```sh pm\nnpm run show -- "before; npm install hidden" && npm i\n```';
      expect(await panels(markdown, { managers: ["pnpm"] })).toEqual([
        ["pnpm", 'pnpm run show "before; npm install hidden" && pnpm install'],
      ]);
    });

    it("preserves separators inside command substitutions", async () => {
      const markdown =
        '```sh pm\nnpm run show -- "$(printf "before; npm install hidden")" && npm i\n```';
      expect(await panels(markdown, { managers: ["pnpm"] })).toEqual([
        ["pnpm", 'pnpm run show "$(printf "before; npm install hidden")" && pnpm install'],
      ]);
    });

    it("preserves separators inside backtick substitutions", async () => {
      const markdown =
        "```sh pm\nnpm run show -- `printf before; npm install hidden` && npm i\n```";
      expect(await panels(markdown, { managers: ["pnpm"] })).toEqual([
        ["pnpm", "pnpm run show `printf before; npm install hidden` && pnpm install"],
      ]);
    });

    it("keeps escaped backticks and nested substitutions opaque", async () => {
      const markdown =
        '```sh pm\nnpm run show -- "`printf \\`before; npm install hidden\\`" && npm i\n```';
      expect(await panels(markdown, { managers: ["pnpm"] })).toEqual([
        ["pnpm", 'pnpm run show "`printf \\`before; npm install hidden\\`" && pnpm install'],
      ]);
    });

    it("takes the managers and their order", async () => {
      expect(
        await panels("```sh pm\nnpm install comark-tabs\n```", {
          managers: ["bun", "deno", "npm"],
        }),
      ).toEqual([
        ["bun", "bun add comark-tabs"],
        ["deno", "deno add npm:comark-tabs"],
        ["npm", "npm install comark-tabs"],
      ]);
    });

    it("keeps the written manager's tab and reports a command another manager has no form for", async () => {
      const markdown = "```sh pm\nbun add -g serve\nbun update\n```";
      const options: TabsOptions = { managers: ["pnpm", "yarn", "deno"] };
      expect(await panels(markdown, options)).toEqual([
        ["bun", "bun add -g serve\nbun update"],
        ["pnpm", "pnpm add -g serve\npnpm update"],
      ]);
      expect((await parseMarkdown(markdown, { plugins: [tabs(options)] })).meta.issues).toEqual([
        '`pm` block 1: `bun add -g serve` has no yarn or deno form, so those tabs are left out. Write the block as a `::code-group{sync="pm"}` by hand.',
        '`pm` block 1: `bun update` has no yarn form, so that tab is left out. Write the block as a `::code-group{sync="pm"}` by hand.',
      ]);
    });

    it("reports a command it can't read for every other manager", async () => {
      const markdown = "```sh pm\nnpm publish && npm install --legacy-peer-deps\n```";
      expect(await panels(markdown)).toEqual([
        ["npm", "npm publish && npm install --legacy-peer-deps"],
      ]);
      expect(await issues(markdown)).toEqual([
        '`pm` block 1: `npm publish` has no pnpm, yarn, or bun form, so those tabs are left out. Write the block as a `::code-group{sync="pm"}` by hand.',
        '`pm` block 1: `npm install --legacy-peer-deps` has no pnpm, yarn, or bun form, so those tabs are left out. Write the block as a `::code-group{sync="pm"}` by hand.',
      ]);
    });

    it("names the rule of a command with no form and of a block with no command", async () => {
      const { meta } = await parseMarkdown(
        "```sh pm\nnpm install -g serve\n```\n\n```sh pm\nls\n```",
        {
          plugins: [tabs()],
        },
      );
      expect(meta.issueRules).toEqual({
        '`pm` block 1: `npm install -g serve` has no yarn form, so that tab is left out. Write the block as a `::code-group{sync="pm"}` by hand.':
          "comark/tabs/no-manager-form",
        "`pm` block 2 has no package manager command, so every tab shows the same code. Write a command such as `npm install` or `pnpm add`.":
          "comark/tabs/no-manager-command",
      });
    });

    it("leaves a block inside a code group as one tab, and the code groups numbered as written", async () => {
      const html = await markup(
        "```sh pm\nnpm i x\n```\n\n::code-group\n```sh [npm] pm\nnpm i x\n```\n\nText\n::",
      );
      expect(html.match(/role="tab"/g)).toHaveLength(5);
      expect(html).not.toMatch(/<pre[^>]*\bpm\b/);
      expect(
        await issues("```sh pm\nnpm i x\n```\n\n::code-group\n```sh [npm]\na\n```\n\nText\n::"),
      ).toEqual([
        '`::code-group` 1: only code blocks go inside. Move the paragraph "Text" out, or use `::tabs`.',
      ]);
    });
  });

  describe("icons", () => {
    const logos: IconCollection = {
      prefix: "logos",
      width: 32,
      height: 32,
      icons: { pnpm: { body: '<path fill="#f9ad00" d="M0 0h8v8H0z"/>' } },
      aliases: { "pnpm-alias": { parent: "pnpm" } },
    };
    const lucide: IconCollection = {
      prefix: "lucide",
      width: 24,
      height: 24,
      icons: { apple: { body: '<path stroke="currentColor" d="M1 1h2"/>' } },
    };
    const iconResolver = createIcons({ collections: { logos, lucide } });
    const parse = (markdown: string, options: TabsOptions = { iconResolver }) =>
      parseMarkdown(markdown, { plugins: [tabs(options)] });
    const html = async (markdown: string, options?: TabsOptions) =>
      (
        await createHtmlRenderer({ plugins: [tabs(options ?? { iconResolver })], components })(
          markdown,
        )
      ).replace(/<style[^>]*>.*?<\/style>|<script>.*?<\/script>/gs, "");

    afterEach(() => vi.unstubAllGlobals());

    it("draws a tab's icon with comark-icon, in the strip and its caption, a monochrome one as a mask", async () => {
      const page = await createHtmlRenderer({ plugins: [tabs({ iconResolver })], components })(
        '::tabs\n:::tabs-item{label="macOS" icon="lucide:apple"}\nA\n:::\n\n:::tabs-item{label="pnpm" icon="logos:pnpm-alias"}\nB\n:::\n\n:::tabs-item{label="Plain"}\nC\n:::\n::',
      );
      expect(page.match(/<style data-comark-icon>/g)).toHaveLength(1);
      const out = page.replace(/<style[^>]*>.*?<\/style>|<script>.*?<\/script>/gs, "");
      const mask =
        /<span class="ci" data-mask aria-hidden="true" style="--ci:url\(&quot;data:image\/svg\+xml,[^"]*currentColor[^"]*&quot;\)"><\/span>macOS/;
      expect(out).toMatch(new RegExp(`tabindex="0">${mask.source}</button>`));
      expect(out).toMatch(new RegExp(`<div class="ct-caption">${mask.source}</div>`));
      expect(out).toMatch(
        /tabindex="-1"><span class="ci" aria-hidden="true" style="--ci:url\(&quot;data:image\/svg\+xml,[^"]*viewBox='0 0 32 32'[^"]*%23f9ad00[^"]*&quot;\)"><\/span>pnpm<\/button>/,
      );
      expect(out).toContain('tabindex="-1">Plain</button>');
      expect(out).toContain('<div class="ct-caption">Plain</div>');
    });

    it("reads a code block's icon after its label, and keeps the rest of its meta", async () => {
      const { nodes } = await parse(
        '::code-group\n```sh [pnpm] icon=logos:pnpm {1}\na\n```\n\n```sh [npm] title="x" icon="https://example.com/n m.svg"\nb\n```\n::',
      );
      const out = JSON.stringify(nodes);
      expect(out).not.toContain("icon=");
      expect(out).toContain('"meta":"title=\\"x\\""');
      expect(
        await html('::code-group\n```sh [npm] icon="https://example.com/n m.svg"\nb\n```\n::'),
      ).toContain(
        '<span class="ci" aria-hidden="true" style="--ci:url(&quot;https://example.com/n%20m.svg&quot;)"></span>npm</button>',
      );
    });

    it("gives tabs without one an icon by label, set once for every block", async () => {
      const out = await html(pm, { iconResolver, icons: { PNPM: "logos:pnpm", "./npm.svg": "x" } });
      expect(out).toMatch(/<span class="ci"[^>]*><\/span>pnpm<\/button>/);
      expect(out).toContain('tabindex="-1">npm</button>');
    });

    it("fetches icons from the Iconify API by default, once per icon", async () => {
      const fetch = vi.fn(
        async () =>
          new Response(
            JSON.stringify({ prefix: "mdi", icons: { a: { body: "<g/>" }, b: { body: "<g/>" } } }),
          ),
      );
      vi.stubGlobal("fetch", fetch);
      const markdown =
        '::tabs\n:::tabs-item{label="A" icon="mdi:a"}\nA\n:::\n\n:::tabs-item{label="B" icon="mdi:b"}\nB\n:::\n::';
      expect((await parse(markdown, {})).meta.issues).toEqual([]);
      expect((await parse(markdown, {})).meta.issues).toEqual([]);
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch).toHaveBeenCalledWith(
        "https://api.iconify.design/mdi.json?icons=a,b",
        expect.anything(),
      );
      expect(await html(markdown, {})).toMatch(/<span class="ci"[^>]*><\/span>B<\/button>/);
    });

    it("reports icons it can't draw in comark-icon's words, and renders their tabs without one", async () => {
      vi.stubGlobal("fetch", async (url: string) =>
        url.includes("/down.") ? new Response("", { status: 503 }) : new Response("404"),
      );
      const markdown =
        '::tabs\n:::tabs-item{label="A" icon="logos:nope"}\nA\n:::\n\n:::tabs-item{label="B" icon="pnpm"}\nB\n:::\n\n:::tabs-item{label="C" icon="gone:x"}\nC\n:::\n\n:::tabs-item{label="D" icon="down:x"}\nD\n:::\n::';
      expect((await parse(markdown)).meta.issues).toEqual([
        '`::tabs` 1, tab 1, icon "logos:nope": The `logos` set has no icon `nope`. Find its name at https://icones.js.org/collection/logos.',
        '`::tabs` 1, tab 2, icon "pnpm": "pnpm" isn\'t an icon name. Write it as `set:name`, such as `lucide:apple`, or give an image URL.',
        '`::tabs` 1, tab 3, icon "gone:x": There\'s no icon set `gone` to draw `gone:x` from. Find a set at https://icones.js.org, or pass `gone` in `collections`.',
        '`::tabs` 1, tab 4, icon "down:x": Couldn\'t load `down:x` from Iconify (HTTP 503). Install `@iconify-json/down` and pass it in `collections`, or try again.',
      ]);
      expect(await html(markdown)).not.toContain('class="ci"');
    });
  });
});
