import { createHtmlRenderer } from "@comark/html";
import { parseMarkdown } from "comark";
import { describe, expect, it } from "vite-plus/test";
import charts, { components } from "../src/html.ts";

const render = createHtmlRenderer({ plugins: [charts()], components });
const issues = async (markdown: string) =>
  (await parseMarkdown(markdown, { plugins: [charts()] })).meta.issues;
const chart = (spec: unknown, props = "", table = latency) =>
  `::chart${props}\n${table.trim()}\n\n\`\`\`vega-lite\n${typeof spec === "string" ? spec : JSON.stringify(spec, null, 2)}\n\`\`\`\n::`;

const latency = `
| endpoint | ms |
| --- | --: |
| /search | 120 |
| /search | 180 |
| /search | 410 |
| /login | 40 |
| /login | 55 |
| /login | 61 |`;
const boxplot = {
  mark: "boxplot",
  encoding: {
    x: { field: "endpoint", type: "nominal" },
    y: { field: "ms", type: "quantitative" },
  },
};

describe("comark-charts with a Vega-Lite spec", () => {
  it("draws any Vega-Lite chart over the table, which stays its data", async () => {
    const markdown = chart(boxplot, '{title="Latency per request"}');
    expect(await issues(markdown)).toEqual([]);
    const html = await render(markdown);
    expect(html).toContain(
      '<figure class="cch" data-type="vega-lite"><figcaption>Latency per request</figcaption><div class="cch-plot"><svg role="img" aria-label="Latency per request"',
    );
    expect(html).toContain(">/search</text>");
    // In the house inks, which the stylesheet swaps for the page's.
    expect(html).toContain('fill="#3b82f6"');
    expect(html).toContain('<details class="cch-data"><summary>Data</summary><table>');
    expect(html).toContain("<td>/login</td>");
    expect(html).not.toContain("<pre");
  });

  it("reports a spec that isn't JSON, carries its own data, or reads a column the table lacks", async () => {
    expect(await issues(chart("{ mark: bar }"))).toEqual([
      expect.stringMatching(
        /^`::chart` 1: its Vega-Lite spec isn't valid JSON \(.+\)\. Fix it, or remove the `vega-lite` block to let comark-charts choose the chart\.$/,
      ),
    ]);
    expect(
      await issues(
        chart(
          {
            ...boxplot,
            data: { url: "data.csv" },
            encoding: { ...boxplot.encoding, color: { field: "region" } },
          },
          '{type="bar"}',
        ),
      ),
    ).toEqual([
      "`::chart` 1: `type` doesn't apply to a chart drawn from a Vega-Lite spec. Name the columns in the spec's `encoding` instead.",
      "`::chart` 1: its Vega-Lite spec has `data`, but a chart's data is its table, so the table replaces it. Remove `data` from the spec.",
      "`::chart` 1: its Vega-Lite spec reads field `region`, but its table has `endpoint` and `ms`. Use the table's headers as field names.",
    ]);
  });

  it("knows the fields a spec's transforms make", async () => {
    const spec = {
      transform: [
        { fold: ["before", "after"] },
        { calculate: "datum.value / 1000", as: "seconds" },
      ],
      mark: "bar",
      encoding: {
        x: { field: "key", type: "nominal" },
        y: { field: "seconds", type: "quantitative" },
        color: { field: "value", type: "quantitative" },
      },
    };
    const table = "| step | before | after |\n| --- | --: | --: |\n| build | 1200 | 800 |";
    expect(await issues(chart(spec, "", table))).toEqual([]);
  });

  it("reports what Vega can't draw, and shows the table", async () => {
    const markdown = chart({ mark: "nonsense" });
    expect(await issues(markdown)).toEqual([
      expect.stringMatching(
        /^`::chart` 1 couldn't be drawn \(.+\), so it shows its table alone\. Check its Vega-Lite spec against https:\/\/vega\.github\.io\/vega-lite\/docs\/\.$/,
      ),
    ]);
    const html = await render(markdown);
    expect(html).not.toContain("<svg");
    expect(html).toContain("<td>/login</td>");
  });

  it("loads nothing a spec names, and draws no links", async () => {
    const html = await render(
      chart({
        layer: [
          { ...boxplot, encoding: { ...boxplot.encoding, href: { value: "javascript:alert(1)" } } },
          {
            data: { values: [{ endpoint: "SECRET", ms: 999 }] },
            mark: "text",
            encoding: { text: { field: "endpoint" } },
          },
          { data: { url: "https://example.com/secret.csv" }, mark: "point" },
          { mark: { type: "image", url: "file:///etc/passwd" } },
        ],
      }),
    );
    expect(html).not.toContain("javascript:");
    expect(html).not.toContain("SECRET");
    expect(html).not.toContain("<a ");
    expect(html).not.toContain("passwd");
  });
});
