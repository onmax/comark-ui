import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import annotate, { components } from "comark-annotate/html";
import charts, { components as chartComponents } from "comark-charts/html";
import { describe, expect, it, vi } from "vite-plus/test";
import { defineDoctorDiagnostics } from "vite-doctor/extension";
import { runProjectFixture } from "vite-doctor/testkit";
import { lint, resolveConfig } from "../src/index.ts";
import comark from "../src/doctor.ts";

const options = { plugins: [annotate()], components };
const check = async (markdown: string) =>
  (await lint(markdown, options)).map(({ rule, line, column, message, fix }) => ({
    rule,
    line,
    column,
    message: `${message} ${fix}`,
  }));

describe("comark/unclosed-block", () => {
  it("passes closed blocks, nested ones included", async () => {
    expect(
      await check(
        `::compare\n:::screenshot{src="a.png" alt="A"}\n:::\n\n:::screenshot{src="b.png" alt="B"}\n:::\n::`,
      ),
    ).toEqual([]);
  });

  it("reports a block left open, and one an outer closer ends", async () => {
    expect(
      await check(`# Title\n\n::compare\n:::screenshot{src="a.png" alt="A"}\n::\n\n::screenshot`),
    ).toEqual(
      expect.arrayContaining([
        {
          rule: "comark/unclosed-block",
          line: 4,
          column: 1,
          message:
            "`:::screenshot` opened on line 4 is never closed. Add a line with `:::` after its last child.",
        },
        {
          rule: "comark/unclosed-block",
          line: 7,
          column: 1,
          message:
            "`::screenshot` opened on line 7 is never closed. Add a line with `::` after its last child.",
        },
      ]),
    );
  });

  it("ignores `::` inside fenced code", async () => {
    expect(await check("```md\n::compare\n```\n\n~~~\n::screnshot{src=\n~~~\n")).toEqual([]);
  });

  it("ignores `::` inside comments and raw HTML blocks, which Comark reads as text", async () => {
    expect(
      await lint(
        "<pre>\n::code\n</pre>\n\n<script>\n::note{a=1 a=2}\n</script>\n\n<!--\n::note\n-->",
      ),
    ).toEqual([]);
  });

  it("checks `::` inside other HTML blocks, which hold Markdown", async () => {
    const found = await lint("<div>\n::note{a=1 a=2}\n</div>");
    expect(found.map(({ rule, line }) => [rule, line])).toEqual([
      ["comark/unclosed-block", 2],
      ["comark/malformed-attributes", 2],
    ]);
  });
});

describe("comark/unknown-component", () => {
  it("passes components from the map and HTML elements", async () => {
    expect(
      await check(`::screenshot{src="a.png" alt="A"}\n::\n\n::div\nText :span[x]\n::`),
    ).toEqual([]);
  });

  it("reports a misspelled block and an inline component, and suggests a known name", async () => {
    const found = await check(`Intro\n\n::screnshot{src="a.png"}\n::\n\nSee :badge[new] here.`);
    expect(found).toEqual([
      {
        rule: "comark/unknown-component",
        line: 3,
        column: 1,
        message:
          "`::screnshot` on line 3 is not a known component. Did you mean `screenshot`? Known: `annotation`, `compare`, `screenshot`.",
      },
      {
        rule: "comark/unknown-component",
        line: 6,
        column: 5,
        message:
          "`:badge` on line 6 is not a known component. Known: `annotation`, `compare`, `screenshot`. If it is yours, add it to the components you give lint-comark.",
      },
    ]);
  });

  it("is off without components, since any name could be valid", async () => {
    expect(await lint("::anything\n::")).toEqual([]);
  });

  it("reports `:name[…]` shorthand blocks and components inside them", async () => {
    const found = await lint(":badge[x]\n\n::outer\n:pill[see :chip[y]]\n::", {
      components: ["outer"],
    });
    expect(found.map(({ line, column, message }) => [line, column, message])).toEqual([
      [1, 1, "`:badge` on line 1 is not a known component."],
      [4, 1, "`:pill` on line 4 is not a known component."],
      [4, 11, "`:chip` on line 4 is not a known component."],
    ]);
  });

  it("takes a list of names as well as a map", async () => {
    expect(await lint("::tabs\n::", { components: ["tabs"] })).toEqual([]);
  });

  it("knows the tabs and code groups of an installed comark-tabs", async () => {
    const markdown =
      '::tabs\n:::tabs-item{label="A"}\nOne.\n:::\n::\n\n::code-group\n```sh [pnpm]\npnpm add x\n```\n::\n';
    expect(await lint(markdown, await resolveConfig())).toEqual([]);
  });

  it("knows the embeds of an installed comark-embed", async () => {
    const markdown = `::embed{url="https://www.youtube.com/watch?v=KCrXgy8qtjM" title="Vite in 100 Seconds"}\n::\n`;
    expect(await lint(markdown, await resolveConfig())).toEqual([]);
  });
});

describe("comark/malformed-attributes", () => {
  it("passes closed attributes with quoted braces", async () => {
    expect(
      await check(
        `::screenshot{src="a}.png" alt='A {b}' .wide}\n::\n\n[Link](https://x.com){target="_blank"}`,
      ),
    ).toEqual([]);
  });

  it("reports an unclosed `{` and a key set twice", async () => {
    expect(
      await check(
        `::screenshot{src="a.png" alt="A"\n::\n\n::screenshot{src="a.png" alt="A" src="b.png"}\n::`,
      ),
    ).toEqual([
      {
        rule: "comark/malformed-attributes",
        line: 1,
        column: 13,
        message:
          "`::screenshot` on line 1 opens its attributes with `{` and never closes them. Add `}` after the last attribute. Comark reads the rest of the line as attributes.",
      },
      {
        rule: "comark/malformed-attributes",
        line: 4,
        column: 34,
        message:
          "`::screenshot` on line 4 sets `src` twice. Keep one `src`. Comark uses the last one and drops the others.",
      },
    ]);
  });

  it("reads past nested braces and escaped quotes in values", async () => {
    expect(await check(`[x]{foo={"x":"}"} foo=2}\n\n[y]{a="q\\"}" b={"c": [1, 2]} a=3}`)).toEqual([
      expect.objectContaining({
        line: 1,
        column: 19,
        message: expect.stringContaining("`foo` twice"),
      }),
      expect.objectContaining({
        line: 3,
        column: 30,
        message: expect.stringContaining("`a` twice"),
      }),
    ]);
  });
});

describe("comark/broken-anchor", () => {
  it("passes links to headings and to `{#id}`", async () => {
    expect(
      await check(`# Install\n\nSee [install](#install) and [box](#box).\n\n**Box**{#box}`),
    ).toEqual([]);
  });

  it("reports a fragment that matches nothing and lists the ids", async () => {
    expect(await check(`# Install\n\n## Usage\n\nSee [usage](#usge).`)).toEqual([
      {
        rule: "comark/broken-anchor",
        line: 5,
        column: 13,
        message:
          "The link to `#usge` on line 5 matches no heading or id in this document. Did you mean `#usage`? Ids here: `#install`, `#usage`. To link somewhere else, add `{#usge}` after the element it should point at.",
      },
    ]);
  });

  it("keeps positions in order across a large generated document", async () => {
    const count = 2_000;
    const markdown = Array.from(
      { length: count },
      (_, index) => `[item ${index}](#missing-${index})`,
    ).join("\n");
    const found = await lint(markdown);

    expect(found).toHaveLength(count);
    expect(found.every(({ rule }) => rule === "comark/broken-anchor")).toBe(true);
    expect(found.map(({ line }) => line)).toEqual(
      Array.from({ length: count }, (_, index) => index + 1),
    );
  });
});

describe("comark/invalid-frontmatter", () => {
  it("passes valid YAML", async () => {
    expect(await check(`---\ntitle: Hello\n---\n\n# Hello`)).toEqual([]);
  });

  it("follows Comark when the YAML starts on the first line", async () => {
    expect(await lint("---title: x\n---\n::bad", { components: [] })).toEqual([
      expect.objectContaining({ rule: "comark/unclosed-block", line: 3, column: 1 }),
      expect.objectContaining({ rule: "comark/unknown-component", line: 3, column: 1 }),
    ]);
  });

  it("reports the YAML error's line and still checks the rest", async () => {
    expect(await check(`---\ntitle: Hello\nsummary: a: b\n---\n\n::zoom\nx`)).toEqual([
      {
        rule: "comark/invalid-frontmatter",
        line: 3,
        column: 11,
        message:
          "The frontmatter is not valid YAML: bad indentation of a mapping entry. Indent nested keys evenly, and quote any value that contains `: ` or starts with `*`, `&`, `!`, `[`, or `{`.",
      },
      {
        rule: "comark/unclosed-block",
        line: 6,
        column: 1,
        message:
          "`::zoom` opened on line 6 is never closed. Add a line with `::` after its last child.",
      },
      expect.objectContaining({ rule: "comark/unknown-component", line: 6 }),
    ]);
  });

  it("keeps the YAML exception as the cause", async () => {
    const found = await lint("---\nsummary: a: b\n---\n\n# Page");
    expect(found).toHaveLength(1);
    expect(found[0]!.cause).toMatchObject({ name: "YAMLException" });
  });
});

describe("plugin issues", () => {
  it("passes a document the plugins accept", async () => {
    expect(await check(`::screenshot{src="a.png" alt="A"}\n::`)).toEqual([]);
  });

  it("passes comark-annotate's issues through, on their block's line", async () => {
    expect(
      await check(
        `# Review\n\n::screenshot{src="a.png" alt="A"}\n::\n\n::screenshot{src="b.png"}\n::\n\n::compare\n::`,
      ),
    ).toEqual([
      {
        rule: "comark/annotate/missing-alt",
        line: 6,
        column: 19,
        message: 'screenshot "b.png": `alt` is required. Describe what the screenshot shows.',
      },
      {
        rule: "comark/annotate/compare-screenshot-count",
        line: 9,
        column: 1,
        message:
          "compare 1: needs exactly two screenshots, before and after (got 0). Add the missing one.",
      },
    ]);
  });

  it("places an issue that names its block as `::name` and a number", async () => {
    const diagnostics = await lint(
      `# Sizes\n\n::chart\n| a | b |\n| --- | --- |\n| x | 1 |\n::\n\n::chart{type="pie"}\n| a | b | c |\n| --- | --- | --- |\n| x | 1 | 2 |\n::`,
      { plugins: [charts()], components: chartComponents },
    );
    expect(diagnostics.map(({ rule, line }) => ({ rule, line }))).toEqual([
      { rule: "comark/charts/too-many-series", line: 9 },
    ]);
  });
});

describe("comark/unsafe-url", () => {
  it("passes http, relative, and data: image URLs", async () => {
    expect(
      await check(
        `<a href="https://x.com">x</a> <img src="data:image/png;base64,AAAA" alt="">\n\n::screenshot{src="a.png" alt="A" href="https://x.com"}\n::`,
      ),
    ).toEqual([]);
  });

  it("reports javascript:, vbscript:, and non-image data: URLs", async () => {
    const found = await check(
      `Text\n\n<a href="jav&#x61;script:alert(1)">x</a>\n\n<iframe src="data:text/html,<p>x"></iframe>\n\n:zoom[x]{href="VBScript:x"}`,
    );
    const urls = found.filter(({ rule }) => rule === "comark/unsafe-url");
    expect(urls.map(({ line, message }) => [line, message.split(".")[0]])).toEqual([
      [3, "The `href` of `a` on line 3 is a `javascript:` URL"],
      [5, "The `src` of `iframe` on line 5 is a `data:` URL"],
      [7, "The `href` of `zoom` on line 7 is a `vbscript:` URL"],
    ]);
  });

  it("places the URL on its attribute, not on the same text in prose", async () => {
    expect(await check(`Text javascript:x\n\n<a href="javascript:x">x</a>`)).toEqual([
      expect.objectContaining({ rule: "comark/unsafe-url", line: 3, column: 10 }),
    ]);
  });

  it("reads a character reference past U+10FFFF as U+FFFD", async () => {
    expect(await check(`<a href="&#${"9".repeat(400)};">x</a> <a href="&#x110000;">y</a>`)).toEqual(
      [],
    );
  });
});

describe("comark/duplicate-id", () => {
  it("reports an id written twice, or one a heading already has", async () => {
    expect(
      (await check(`## Setup\n\n## Pond {#setup}\n\n## Census {#count}\n\nText {#count}`)).map(
        ({ rule, line }) => ({ rule, line }),
      ),
    ).toEqual([
      { rule: "comark/duplicate-id", line: 3 },
      { rule: "comark/duplicate-id", line: 7 },
    ]);
  });

  it("passes headings Comark numbers itself", async () => {
    expect(await check(`## Setup\n\n## Setup`)).toEqual([]);
  });

  it("places repeated HTML ids on the duplicate attribute", async () => {
    expect(
      (await check(`<div id="panel">one</div>\n\n<div id="panel">two</div>`)).map(
        ({ line }) => line,
      ),
    ).toEqual([3]);
  });
});

describe("comark/missing-alt", () => {
  it("reports an image without alt text, and passes one marked as decoration", async () => {
    expect(await check(`![](pond.png)\n\n![](roof.png){alt=""}\n\n![Ducks](ducks.png)`)).toEqual([
      {
        rule: "comark/missing-alt",
        line: 1,
        column: 3,
        message:
          'The image `pond.png` on line 1 has no alt text, so screen readers skip it or read its file name. Describe what it shows between the brackets, as in `![Pigeons on the roof](pond.png)`, or add `{alt=""}` after it if it\'s only decoration.',
      },
    ]);
  });

  it("locates a repeated source after a valid image and raw HTML images", async () => {
    expect(await check(`![Ducks](pond.png)\n\n<img src="pond.png">`)).toEqual([
      expect.objectContaining({ rule: "comark/missing-alt", line: 3 }),
    ]);
  });
});

describe("comark/empty-link", () => {
  it("reports a link with nothing between its brackets", async () => {
    expect(
      (await check(`See [](/census/) and [the pond](/pond/).`)).map(({ rule, line }) => ({
        rule,
        line,
      })),
    ).toEqual([{ rule: "comark/empty-link", line: 1 }]);
  });

  it("passes a link an aria-label names", async () => {
    expect(await check(`See [](/census/){aria-label="The census"}.`)).toEqual([]);
  });

  it("locates a repeated source after a valid link and raw HTML links", async () => {
    expect(await check(`[the pond](/pond/)\n\n<a href="/pond/"></a>`)).toEqual([
      expect.objectContaining({ rule: "comark/empty-link", line: 3 }),
    ]);
  });

  it("leaves a raw HTML link with an aria-label alone", async () => {
    expect(await check(`See <a href="/census/" aria-label="The census"></a>.`)).toEqual([]);
  });
});

describe("meta.issueRules", () => {
  const issues = (rules: Record<string, string>) => ({
    name: "duck-count",
    post({ tree }: { tree: { meta: Record<string, unknown> } }) {
      tree.meta.issues = Object.keys(rules);
      tree.meta.issueRules = rules;
    },
  });

  it("reports each issue under the rule its plugin names, and the rest as comark/plugin-issue", async () => {
    const found = await lint("# Ducks", {
      plugins: [
        issues({
          "`::embed` 1: `url` is required. Write it.": "comark/embed/missing-url",
          "duck-count 1: `pond` is required. Write it.": "duck-count/missing-pond",
          "duck-count 2: `pond` is empty. Fill it.": "",
        }),
      ],
    });
    expect(found.map(({ rule }) => rule)).toEqual([
      "comark/embed/missing-url",
      "comark/plugin-issue",
      "comark/plugin-issue",
    ]);
  });
});

describe("lint()", () => {
  it("preserves a plugin's original exception", async () => {
    const cause = new Error("The plugin could not read its input.");
    const found = await lint("# Title", {
      plugins: [
        {
          name: "broken",
          post() {
            throw cause;
          },
        },
      ],
    });
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ rule: "comark/plugin-issue", line: 1 });
    expect(found[0]!.cause).toBe(cause);
  });

  it("turns a rule that crashes into one diagnostic and still runs the others", async () => {
    const broken = {
      name: "broken",
      post(state: { tree: { nodes: unknown[] } }) {
        state.tree.nodes.push(["a", null]);
      },
    };
    const found = await lint("::compare\n", { plugins: [broken] });
    expect(found.map(({ rule, message }) => [rule, message])).toEqual([
      [
        "comark/broken-anchor",
        "lint-comark crashed while checking `comark/broken-anchor`: Cannot read properties of null (reading 'id').",
      ],
      [
        "comark/unsafe-url",
        "lint-comark crashed while checking `comark/unsafe-url`: Cannot read properties of null (reading 'href').",
      ],
      [
        "comark/duplicate-id",
        "lint-comark crashed while checking `comark/duplicate-id`: Cannot read properties of null (reading 'id').",
      ],
      [
        "comark/missing-alt",
        "lint-comark crashed while checking `comark/missing-alt`: Cannot read properties of null (reading 'src').",
      ],
      [
        "comark/empty-link",
        "lint-comark crashed while checking `comark/empty-link`: Cannot read properties of null (reading 'href').",
      ],
      [
        "comark/broken-link",
        "lint-comark crashed while checking `comark/broken-link`: Cannot read properties of null (reading 'href').",
      ],
      ["comark/unclosed-block", "`::compare` opened on line 1 is never closed."],
    ]);
    for (const diagnostic of found.filter(({ message }) =>
      message.startsWith("lint-comark crashed"),
    ))
      expect(diagnostic.cause).toBeInstanceOf(TypeError);
  });
});

describe("positions", () => {
  it("count the frontmatter in line numbers", async () => {
    const body = "::screnshot\n::";
    expect((await check(body))[0]).toMatchObject({ line: 1 });
    expect((await check(`---\ntitle: A\ndescription: B\n---\n\n${body}`))[0]).toMatchObject({
      line: 6,
    });
  });
});

describe("lint-comark CLI", () => {
  const cli = (...args: string[]) =>
    promisify(execFile)(process.execPath, [
      new URL("../dist/cli.mjs", import.meta.url).pathname,
      ...args,
    ]);

  it("prints file:line:col, the rule, and the fix, and exits with 1 on any problem", async () => {
    const dir = await mkdtemp(join(tmpdir(), "lint-comark-"));
    await writeFile(join(dir, "ok.md"), `::screenshot{src="a.png" alt="A"}\n::\n`);
    await writeFile(join(dir, "a.png"), "");
    await writeFile(join(dir, "bad.md"), `# Title\n\n::compare\n`);
    expect((await cli(join(dir, "ok.md"))).stdout).toBe("No problems.\n");
    await expect(cli(join(dir, "*.md"))).rejects.toMatchObject({
      code: 1,
      stdout: `${join(dir, "bad.md")}:3:1 comark/unclosed-block \`::compare\` opened on line 3 is never closed. Add a line with \`::\` after its last child.\n${join(dir, "bad.md")}:3:1 comark/annotate/compare-screenshot-count compare 1: needs exactly two screenshots, before and after (got 0). Add the missing one.\n`,
    });

    const json = await cli(join(dir, "bad.md"), "--format", "json").catch(
      (error: { stdout: string }) => error,
    );
    expect(JSON.parse(json.stdout)).toEqual([
      expect.objectContaining({
        file: join(dir, "bad.md"),
        rule: "comark/unclosed-block",
        line: 3,
      }),
      expect.objectContaining({ rule: "comark/annotate/compare-screenshot-count" }),
    ]);

    await expect(cli(join(dir, "missing.md"))).rejects.toMatchObject({
      code: 2,
      stderr: expect.stringContaining(`lint-comark: can't read ${join(dir, "missing.md")}`),
    });
  });

  it("adds a config's components to the installed packages'", async () => {
    const dir = await mkdtemp(join(tmpdir(), "lint-comark-"));
    await writeFile(join(dir, "pigeon-coop.md"), `::pigeon-coop\n::\n`);
    await writeFile(
      join(dir, "lint-comark.config.mjs"),
      `export default { components: ["pigeon-coop"] };\n`,
    );
    await expect(cli(join(dir, "pigeon-coop.md"))).rejects.toMatchObject({ code: 1 });
    expect(
      (await cli(join(dir, "pigeon-coop.md"), "--config", join(dir, "lint-comark.config.mjs")))
        .stdout,
    ).toBe("No problems.\n");
  });

  it("prints JSON when a plugin throws a circular exception", async () => {
    const root = new URL("../../../test-results/", import.meta.url);
    await mkdir(root, { recursive: true });
    const dir = await mkdtemp(new URL("lint-comark-", root).pathname);
    try {
      await writeFile(join(dir, "page.md"), "# Page");
      await writeFile(
        join(dir, "lint-comark.config.mjs"),
        `
        const error = new Error("Plugin failed");
        error.cause = error;
        export default { plugins: [{ name: "broken", post() { throw error; } }] };
      `,
      );
      await expect(
        cli(
          join(dir, "page.md"),
          "--config",
          join(dir, "lint-comark.config.mjs"),
          "--format",
          "json",
        ),
      ).rejects.toMatchObject({
        code: 1,
        stdout:
          JSON.stringify(
            [
              {
                file: join(dir, "page.md"),
                rule: "comark/plugin-issue",
                line: 1,
                message: "Comark could not parse this document: Plugin failed",
                fix: "Fix what the error names; a plugin that throws stops the whole document from rendering.",
              },
            ],
            null,
            2,
          ) + "\n",
      });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe("lint-comark/doctor", () => {
  it.each(["\n", "\r\n", "\r"])(
    "keeps sources and ranges aligned for %j newlines",
    async (newline) => {
      const text = ["---", "title: Page", "---", "", "# Page", "", "::wat", "::"].join(newline);
      const result = await runProjectFixture({
        framework: "vite",
        extensions: [comark({ components: [] })],
        files: { "docs/page.md": text },
      });
      expect(result.diagnostics).toHaveLength(1);
      const [report] = result.diagnostics;
      expect(report!.code).toBe("COMARK0002");
      expect(report!.range).toEqual({
        start: text.indexOf("::wat"),
        end: text.indexOf("::wat"),
        line: 7,
        column: 1,
      });
      expect(report!.diagnostic.sources).toEqual([`${report!.file}:7:1`]);
    },
  );

  it("reports Markdown problems as Vite Doctor diagnostics", async () => {
    const result = await runProjectFixture({
      framework: "vite",
      extensions: [comark()],
      files: {
        "docs/page.md": `# Page\n\n::screnshot{src="a.png"}\n::\n\n[Usage](#usage)\n`,
        "docs/ok.mdc": `# Fine\n`,
        "docs/a.png": "",
        "node_modules/x/README.md": `::broken\n`,
      },
    });
    expect(
      result.diagnostics.map((diagnostic) => [
        diagnostic.code,
        diagnostic.ruleId,
        diagnostic.file?.replace(/^.*\/docs\//, "docs/"),
        diagnostic.range?.line,
      ]),
    ).toEqual([
      ["COMARK0002", "comark/unknown-component", "docs/page.md", 3],
      ["COMARK0004", "comark/broken-anchor", "docs/page.md", 6],
    ]);
    for (const report of result.diagnostics) {
      expect(report.diagnostic.name).toBe(report.code);
      expect(report.diagnostic.why).toBe(report.message);
      expect(report.diagnostic.fix).toBe(report.suggestion);
      expect(report.diagnostic.docs).toBe(
        `https://comark-ui.onmax.me/doctor/${report.ruleId.replace(/^comark\//, "")}/`,
      );
      expect(report.diagnostic.sources).toEqual([
        `${report.file}:${report.range!.line}:${report.range!.column}`,
      ]);
      expect(report.sources).toEqual(report.diagnostic.sources);
      expect(report.diagnostic.toJSON()).toMatchObject({
        name: report.code,
        why: report.message,
        fix: report.suggestion,
        docs: report.docs,
        sources: report.sources,
      });
    }
  });

  it("preserves a thrown nostics diagnostic without reporting it twice", async () => {
    const upstream = defineDoctorDiagnostics([{ code: "TEST0001", ruleId: "test/plugin" }]);
    const cause = upstream.diagnostics.TEST0001({
      why: "The diagram plugin could not read its input.",
      fix: "Close the diagram's brackets.",
      sources: ["diagram.txt:4:2"],
      cause: new Error("Unexpected end of input"),
    });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const result = await runProjectFixture({
        framework: "vite",
        extensions: [
          comark({
            plugins: [
              {
                name: "broken",
                post() {
                  throw cause;
                },
              },
            ],
          }),
        ],
        files: { "docs/page.md": "# Page" },
      });
      const reports = result.diagnostics.filter(({ ruleId }) => ruleId === "comark/plugin-issue");
      expect(reports).toHaveLength(1);
      expect(reports[0]!.diagnostic.cause).toBe(cause);
      expect(reports[0]!.diagnostic.sources).toEqual([`${reports[0]!.file}:1:1`]);
      expect(warn).not.toHaveBeenCalled();
      expect(error).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
      error.mockRestore();
    }
  });
});
