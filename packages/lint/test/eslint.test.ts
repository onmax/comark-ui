import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ESLint, type Linter } from "eslint";
import { afterAll, beforeAll, describe, expect, it } from "vite-plus/test";
// The plugin starts its worker from the built package.
import comark from "comark-linter/eslint";

let root: string;
beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), "comark-eslint-"));
  await writeFile(join(root, "other.md"), "# Other\n");
  await writeFile(
    join(root, "lint-comark.config.mjs"),
    'export default { components: ["duck-count"] };\n',
  );
});
afterAll(() => rm(root, { recursive: true, force: true }));

const run = async (markdown: string, ...configs: Linter.Config[]) => {
  const eslint = new ESLint({
    cwd: root,
    overrideConfigFile: true,
    overrideConfig: [comark.configs.recommended, ...configs],
  });
  const [result] = await eslint.lintText(markdown, { filePath: join(root, "page.md") });
  return result!.messages.map(({ ruleId, severity, line, column, message }) => ({
    ruleId,
    severity,
    line,
    column,
    message,
  }));
};

describe("comark-linter/eslint", () => {
  it("reports each problem under its rule, with its line, column, and fix", async () => {
    expect(
      await run(
        "---\ntitle: Pigeons\n---\n\n# Pigeons\n\n::screnshot\n::\n\n[Count](./missing.md) [Other](./other.md#nope)\n\n::div\n",
      ),
    ).toEqual([
      {
        ruleId: "comark/unknown-component",
        severity: 1,
        line: 7,
        column: 1,
        message: expect.stringMatching(
          /^`::screnshot` on line 7 is not a known component\. Did you mean `screenshot`\? Known: /,
        ),
      },
      {
        ruleId: "comark/broken-link",
        severity: 1,
        line: 10,
        column: 9,
        message:
          "The link to `./missing.md` on line 10 points at `missing.md`, which doesn't exist. Fix the path, or add the missing file.",
      },
      {
        ruleId: "comark/broken-anchor",
        severity: 1,
        line: 10,
        column: 31,
        message:
          "The link to `./other.md#nope` on line 10 matches no heading or id in `other.md`. Ids there: `#other`.",
      },
      {
        ruleId: "comark/unclosed-block",
        severity: 1,
        line: 12,
        column: 1,
        message:
          "`::div` opened on line 12 is never closed. Add a line with `::` after its last child.",
      },
    ]);
  });

  it("reports a package's issues under its own rule, with the severity its page gives", async () => {
    expect(
      await run('::embed{url="http://example.com/pigeons" title="The pigeon census"}\n::\n'),
    ).toEqual([
      {
        ruleId: "comark/embed/insecure-url",
        severity: expect.any(Number),
        line: 1,
        column: 1,
        message: expect.stringContaining("https://"),
      },
    ]);
    expect(
      await run('The pond has a :a[feed the ducks]{href="javascript:alert(1)"} button.\n'),
    ).toEqual([expect.objectContaining({ ruleId: "comark/unsafe-url", severity: 2 })]);
  });

  it("configures each rule like any ESLint rule, comments included", async () => {
    const markdown = "::div\n\n::div\n";
    expect(await run(markdown, { rules: { "comark/unclosed-block": "off" } })).toEqual([]);
    expect(await run(markdown, { rules: { "comark/unclosed-block": "error" } })).toEqual([
      expect.objectContaining({ severity: 2, line: 1 }),
      expect.objectContaining({ severity: 2, line: 3 }),
    ]);
    expect(
      await run("<!-- eslint-disable-next-line comark/unclosed-block -->\n::div\n\n::div\n"),
    ).toEqual([expect.objectContaining({ ruleId: "comark/unclosed-block", line: 4 })]);
  });

  it("adds the components of `settings.comark.config`", async () => {
    const markdown = "::duck-count\n::\n";
    expect(await run(markdown)).toEqual([
      expect.objectContaining({ ruleId: "comark/unknown-component" }),
    ]);
    expect(
      await run(markdown, { settings: { comark: { config: "lint-comark.config.mjs" } } }),
    ).toEqual([]);
  });

  it("reports a config that fails to load instead of throwing", async () => {
    expect(
      await run("# Fine\n", { settings: { comark: { config: "missing.config.mjs" } } }),
    ).toEqual([
      expect.objectContaining({
        ruleId: "comark/plugin-issue",
        line: 1,
        message: expect.stringContaining("`missing.config.mjs` in `settings.comark.config`"),
      }),
    ]);
  });

  it("leaves `comark/dead-url` out of recommended, since it requests every URL", () => {
    expect(comark.configs.recommended.rules).not.toHaveProperty("comark/dead-url");
    expect(comark.rules).toHaveProperty("dead-url");
  });
});
