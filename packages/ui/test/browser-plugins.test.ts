import { createHtmlRenderer, renderHtmlFromDocument } from "@comark/html";
import { parseMarkdown } from "comark";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { browserPlugins, components } from "../../../docs/plugins.ts";

const markdown = [
  "[Docs](https://example.org/docs)",
  ':badge{source="github-actions" repository="onmax/comark-ui" workflow="ci.yml"}',
].join("\n\n");
const render = (...args: Parameters<typeof browserPlugins>) =>
  createHtmlRenderer({ plugins: browserPlugins(...args), components })(markdown);

const fetchStub = () => {
  const fetch = vi.fn(async (url: string) =>
    url.includes("api.github.com")
      ? Response.json({ workflow_runs: [{ status: "completed", conclusion: "success" }] })
      : new Response(new Uint8Array([137, 80, 78, 71]), {
          headers: { "content-type": "image/png" },
        }),
  );
  vi.stubGlobal("fetch", fetch);
  return fetch;
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("browser download policy", () => {
  it("links chip and badge images instead of downloading them when download is off", async () => {
    const fetch = fetchStub();
    const html = await render({}, { download: false });
    expect(html).toContain('src="https://www.google.com/s2/favicons?domain=example.org&amp;sz=64"');
    expect(html).toContain("https://comark-ui.onmax.me/badge.svg?");
    expect(html).not.toContain("data:image/png");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("downloads chip and badge images by default for static pages", async () => {
    const fetch = fetchStub();
    const html = await render();
    expect(html).toContain('src="data:image/png;base64,');
    expect(html).not.toContain("https://comark-ui.onmax.me/badge.svg?");
    expect(fetch).toHaveBeenCalled();
  });
});

describe("docs and playground registration", () => {
  it.each([
    [
      "annotate",
      '::screenshot{src="a.png" alt="Toolbar" viewport="100x100"}\n::',
      '<img src="a.png" alt="Toolbar"',
    ],
    [
      "cards",
      '::card{title="Docs" to="/guide"}\nRead it.\n::',
      '<a class="ccr-link" href="/guide" aria-label="Docs">',
    ],
    ["carousel", "::carousel\n![Slide](a.png)\n::", 'class="cc-slide"'],
    [
      "cast",
      '::cast\n```\n{"version":2,"width":10,"height":1}\n[0,"o","hello"]\n```\n::',
      '<pre class="cca-term">hello</pre>',
    ],
    ["code", "```ts\nconst x = 1\n```", 'class="ck-copy"'],
    ["code-notes", "```ts\nconst x = 1; // <1>\n```\n\n1. Count.", 'class="cn-marker"'],
    ["colors", "`#ff0000`", 'class="cco"'],
    ["comments", 'A :comment[word]{by="Reviewer" note="Check this."}.', 'class="cr-card"'],
    ["details", '::details{summary="More"}\nDetails.\n::', '<details class="cdt"'],
    [
      "diagrams",
      "```d2 [Audit diagram]\nfirst -> second\n```",
      '<figure class="cdg" data-type="d2">',
    ],
    [
      "diff",
      '::diff{file="src/a.ts"}\n```\nbefore\n```\n\n```\nafter\n```\n::',
      '<tr class="cd-del"',
    ],
    [
      "embed",
      '::embed{url="https://youtu.be/KCrXgy8qtjM"}\n::',
      'src="https://www.youtube-nocookie.com/embed/KCrXgy8qtjM',
    ],
    [
      "fields",
      '::field{name="options" type="object" :required="true"}\nOptions.\n::',
      '<code class="cfl-name">options</code>',
    ],
    ["file-tree", "::file-tree\n```\nsrc/\n  index.ts\n```\n::", "<details open>"],
    ["github", "> [!TIP]\n> Keep it.", 'class="cgc"'],
    ["icon", ':icon{name="audit:check"}', '<span class="ci"'],
    ["links", "## Install", 'class="cl-anchor" href="#install"'],
    [
      "magic-move",
      "::magic-move\n```ts [Before]\nconst x = 1\n```\n\n```ts [After]\nconst x = 2\n```\n::",
      'class="cmv-tab"',
    ],
    ["mark", "==Highlight==", '<mark class="cmk-mark">Highlight</mark>'],
    ["math", "$x^2$", '<span class="cmh"><math'],
    ["media", "![Demo](demo.mp4){width=640 height=360}", '<video src="demo.mp4" controls'],
    ["metrics", ":progress{value=0.4}", 'class="cmt-progress"'],
    ["outline", "::toc\n::\n\n## Install", '<nav class="cto"'],
    ["properties", "---\nstatus: Ready\n---\n\nBody", '<span class="cfm-status">Ready</span>'],
    ["qr", ':qr{value="https://example.com"}', 'aria-label="QR code: https://example.com"'],
    [
      "quiz",
      "::question{#audit}\nPick one.\n\n- [x] Right\n- [ ] Wrong\n  > Because it is incorrect.\n::",
      'class="cqz-option"',
    ],
    [
      "sources",
      "Source :cite[1].\n\n::sources\n1. [Reference](https://example.com)\n::",
      'href="#cso-1" id="cso-1-cite-1" title="Reference"',
    ],
    ["steps", "::steps\n### Install\nRun it.\n::", 'class="cs"'],
    ["table", "```csv\nBird,Seen\nHeron,2\n```", "<td>Heron</td>"],
    ["tabs", '::tabs\n:::tabs-item{label="Install"}\nRun it.\n:::\n::', 'role="tabpanel"'],
    [
      "tests",
      '::tests\n```xml\n<testsuite><testcase name="one"/></testsuite>\n```\n::',
      'class="ctr-count" data-kind="passed">1 passed</span>',
    ],
    ["zoom", "![Photo](a.png)", 'data-zoom="" tabindex="0"'],
  ])("renders %s through the docs configuration", async (_name, markdown, expected) => {
    vi.stubGlobal("fetch", async (input: string | URL | Request) => {
      const url = input instanceof Request ? input.url : String(input);
      if (url !== "https://kroki.io/d2/svg") throw new Error(`Unexpected request: ${url}`);
      return new Response(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M0 0h20v20H0z"/></svg>',
      );
    });
    const plugins = browserPlugins(
      {},
      {
        download: false,
        icon: {
          fetch: false,
          collections: {
            audit: { prefix: "audit", icons: { check: { body: '<path d="M1 1h2"/>' } } },
          },
        },
      },
    );
    const value = await parseMarkdown(markdown, { plugins });
    expect(value.meta.issues).toEqual([]);
    const html = (await renderHtmlFromDocument(value, { components })).replace(
      /<style[^>]*>[\s\S]*?<\/style>|<script[^>]*>[\s\S]*?<\/script>/g,
      "",
    );
    expect(html).toContain(expected);
  });
});
