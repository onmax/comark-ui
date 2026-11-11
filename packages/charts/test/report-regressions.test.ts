import { createHtmlRenderer, renderHtmlFromDocument } from "@comark/html";
import { parseMarkdown } from "comark";
import { describe, expect, it } from "vite-plus/test";
import charts, { components } from "../src/html.ts";

const render = createHtmlRenderer({ plugins: [charts()], components });
const chart = (table: string, props: string) => `::chart${props}\n${table}\n::`;
const texts = (html: string) =>
  [...html.matchAll(/<text [^>]*>([^<]+)<\/text>/g)].map(([, text]) => text);
const attribute = (tag: string, name: string) =>
  new RegExp(`(?:^| )${name}="([^"]*)"`).exec(tag)?.[1] ?? "";
const position = (tag: string) =>
  /translate\(([-\d.]+),([-\d.]+)\)/.exec(tag)!.slice(1).map(Number);

// Compare names and leaders with the actual paths and points, including Vega's color and x ordering.
function expectLineNames(html: string, namesByHeight: string[]) {
  const ends = [...html.matchAll(/<g class="mark-line role-mark[^"]*">(<path[^>]+\/>)/g)]
    .map(([, path]) => {
      const points = [...attribute(path!, "d").matchAll(/[ML]([-\d.]+),([-\d.]+)/g)]
        .map((point) => ({ x: Number(point[1]), y: Number(point[2]) }))
        .sort((a, b) => b.x - a.x);
      return { ...points[0]!, color: attribute(path!, "stroke") };
    })
    .sort((a, b) => a.y - b.y);
  expect(ends).toHaveLength(namesByHeight.length);
  const leaders = [...html.matchAll(/<line [^>]*stroke-opacity="0.5"[^>]*\/>/g)].map(
    ([tag]) => tag,
  );
  const points = [...html.matchAll(/<path transform="translate\([^>]+\/>/g)].map(([tag]) => tag);
  for (const [index, end] of ends.entries()) {
    const name = namesByHeight[index]!;
    const label = [...html.matchAll(/<text [^>]*>[^<]+<\/text>/g)]
      .map(([tag]) => tag)
      .find((tag) => tag.endsWith(`>${name}</text>`))!;
    expect(attribute(label, "fill")).toBe(end.color);
    const leader = leaders.find((tag) => attribute(tag, "stroke") === end.color)!;
    const [x, y] = position(leader);
    expect(x).toBeCloseTo(end.x + 4, 1);
    expect(y).toBeCloseTo(end.y, 1);
    const point = points.find((tag) => {
      const [x, y] = position(tag);
      return Math.abs(x! - end.x) < 0.02 && Math.abs(y! - end.y) < 0.02;
    })!;
    expect(attribute(point, "fill")).toBe(end.color);
  }
}

describe("report chart regressions", () => {
  it("validates the effective log axis after a categorical x fallback", async () => {
    const markdown = chart(
      "| x | y |\n| --- | ---: |\n| a | 0 |\n| b | 10 |",
      '{log="both" labels=false}',
    );
    for (const draw of [false, true]) {
      const document = await parseMarkdown(markdown, { plugins: [charts({ draw })] });
      expect(document.meta.issues).toHaveLength(2);
      expect(document.meta.issues).toContain(
        "`::chart` 1: a log scale has no place for 0, since it only holds numbers above 0. Remove `log`, or leave the cell empty.",
      );
      if (draw)
        expect(await renderHtmlFromDocument(document, { components })).toContain('<svg role="img"');
    }
  });

  it.each([
    ["sparse numeric", "| 1 | | 10 |\n| 2 | 20 | 30 |\n| 3 | 30 | 40 |"],
    ["descending temporal", "| 2026-05 | 20 | 30 |\n| 2026-04 | 10 | 20 |"],
    ["descending numeric", "| 3 | 30 | 40 |\n| 1 | 10 | 20 |\n| 2 | 20 | 30 |"],
    ["sparse categorical", "| z | | 10 |\n| a | 20 | 40 |\n| m | 30 | |"],
  ])("attaches names to the drawn endpoints and colors for %s data", async (_kind, rows) => {
    const html = await render(
      chart(`| x | before | after |\n| --- | ---: | ---: |\n${rows}`, '{type="line"}'),
    );
    expectLineNames(html, ["after", "before"]);
    expect(html).not.toContain("role-legend");
  });

  it.each([0, -5])("ignores a %s reference target on a log value axis", async (value) => {
    const table = "| x | value |\n| --- | ---: |\n| a | 1 |\n| b | 10 |";
    const document = await parseMarkdown(
      chart(
        `${table}\n:::annotation{mark="line" value="${value}"}\nTarget\n:::`,
        '{type="line" log}',
      ),
      { plugins: [charts()] },
    );
    expect(document.meta.issues).toHaveLength(1);
    expect(Object.values(document.meta.issueRules ?? {})).toEqual(["comark/charts/invalid-line"]);
    const html = await renderHtmlFromDocument(document, { components });
    const plain = await render(chart(table, '{type="line" log}'));
    expect(html.match(/<svg[\s\S]*?<\/svg>/)?.[0]).toBe(plain.match(/<svg[\s\S]*?<\/svg>/)?.[0]);
    expect(html).not.toContain("Target");
  });

  it("formats waterfall totals, signed changes, and ticks with compact units", async () => {
    const html = await render(
      chart(
        "| step | value |\n| --- | ---: |\n| start | 10000 |\n| add | 2500 |\n| drop | -500 |\n| end | 12000 |",
        '{type="waterfall" labels unit="$"}',
      ),
    );
    expect(texts(html)).toEqual(expect.arrayContaining(["$10k", "+$2.5k", "-$500", "$12k", "$2k"]));
    for (const raw of ["10,000", "+2,500", "-500", "12,000"])
      expect(texts(html)).not.toContain(raw);
    expect(html).toMatch(/<td[^>]*>10000<\/td>/);
  });

  it("includes the unit when deciding whether waterfall labels fit", async () => {
    const html = await render(
      chart(
        // Eight steps leave each about 80px: room for "10k", not for "10k requests/sec".
        "| step | value |\n| --- | ---: |\n| start | 10000 |\n| a | 2000 |\n| b | 1000 |\n| c | -500 |\n| d | 1500 |\n| e | 1000 |\n| f | -1000 |\n| end | 14000 |",
        '{type="waterfall" labels unit="requests/sec"}',
      ),
    );
    expect(html).not.toMatch(/class="mark-text role-mark/);
    expect(texts(html)).toContain("10k requests/sec");
  });

  it("leaves heatmap labels that cannot fit to the data table", async () => {
    const table =
      "| name | a | b | c |\n| --- | ---: | ---: | ---: |\n| first | 1 | 10 | 100 |\n| second | 2 | 20 | 200 |";
    const html = await render(chart(table, '{type="heatmap" unit="requests/sec"}'));
    expect(texts(html).filter((text) => text?.endsWith("requests/sec"))).toEqual([]);
    expect(html).toMatch(/<td[^>]*>100<\/td>/);
    expect(texts(await render(chart(table, '{type="heatmap"}')))).toContain("100");
  });
});
