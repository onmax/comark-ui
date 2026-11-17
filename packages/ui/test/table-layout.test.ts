import { createHtmlRenderer } from "@comark/html";
import { parseMarkdown } from "comark";
import { describe, expect, it } from "vite-plus/test";
import html from "../src/html.ts";
import { typesetCss } from "../src/typeset-css.ts";

const offline = {
  chips: { download: false },
  badge: { download: false },
  icon: { fetch: false },
  diagrams: { draw: false },
} as const;
const nodes = async (markdown: string, options = {}) =>
  (await parseMarkdown(markdown, html({ ...offline, ...options }))).nodes;

const prs = `| PR | Summary | Status / your next step | Links |
|---|---|---|---|
| portal #1596 | Each user keeps their own column layout in every table | Christopher requested changes: show when the layout differs from the default and add a reset button. | [preview](https://example.com) |
| portal #1610 | Alert details describe demand line outliers: the quantity against the SKU's average per demand line | Preview deployed, e2e running, no reviewer. Check the before/after, then request Christopher. | [drop](https://example.com/d) |
| website #33 | Planning guides and a Netstock comparison | Green, no reviewer. Request Christopher. | |
`;

describe("table layout", () => {
  it("keeps a small table as it is, with its short columns on one line", async () => {
    const [table] = await nodes("| Name | Seen |\n|---|---|\n| Heron | 2 |\n");
    expect(table![0]).toBe("table");
    expect(JSON.stringify(table)).toContain('"data-short":""');
  });

  it("puts a wide table in a div that grows, and stacks its prose columns in order", async () => {
    const [wrapper] = await nodes(prs);
    expect(wrapper![0]).toBe("div");
    expect(wrapper![1]).toEqual({ "data-wide": "", "data-width": "72", "data-stack": "3-2" });
    const table = wrapper![2] as unknown[];
    const tbody = table[3] as unknown[];
    const row = tbody[2] as [string, Record<string, string>, ...[string, Record<string, string>][]];
    const cells = row.slice(2) as [string, Record<string, string>][];
    expect(
      cells.map(([, attrs]) => [
        attrs["data-col"],
        attrs["data-row"] ?? null,
        "data-short" in attrs,
      ]),
    ).toEqual([
      ["1", null, true],
      ["2", "1", false],
      ["2", "2", false],
      ["3", null, true],
    ]);
    expect(cells.map(([, attrs]) => attrs.role)).toEqual(["cell", "cell", "cell", "cell"]);
    expect(row[1].role).toBe("row");
  });

  it("leaves tables inside a list item alone", async () => {
    const [list] = await nodes(`- One\n\n  ${prs.replaceAll("\n", "\n  ")}`);
    expect(JSON.stringify(list)).not.toContain("data-wide");
  });

  it("is on by default, adds div to the allowed tags, and turns off with tableLayout: false", async () => {
    expect(html(offline).tags).toContain("div");
    const [table] = await nodes(prs, { tableLayout: false });
    expect(table![0]).toBe("table");
  });

  it("styles every step and stacks below 85% of its width", async () => {
    const output = await createHtmlRenderer(html(offline))(prs);
    expect(output).toContain('<div data-wide="" data-width="72" data-stack="3-2">');
    expect(typesetCss).toContain('[data-width="72"]{--comark-wide-width:72em;}');
    expect(typesetCss).toContain("@container(max-width:60.99em)");
  });
});
