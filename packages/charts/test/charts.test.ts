import { createHtmlRenderer, renderHtmlFromDocument } from "@comark/html";
import { createMarkdownParser, parseMarkdown } from "comark";
import annotate, { components as annotateComponents } from "comark-annotate/html";
import { describe, expect, it } from "vite-plus/test";
import charts, { components } from "../src/html.ts";

const render = createHtmlRenderer({ plugins: [charts()], components });
const issues = async (markdown: string) =>
  (await parseMarkdown(markdown, { plugins: [charts()] })).meta.issues;
const chart = (table: string, props = "") => `::chart${props}\n${table.trim()}\n::`;

const sizes = `
| package | size (kB) |
| --- | --: |
| annotate | 41.2 |
| zoom | 18.1 |
| lint | 27.5 |`;
const months = `
| month | before | after |
| --- | --: | --: |
| 2026-04 | 820 | 610 |
| 2026-05 | 1,020 | 598 |
| 2026-06 | 990 | 640 |`;

describe("comark-charts", () => {
  it("accepts Comark's metadata while streaming an annotated chart", async () => {
    const parse = createMarkdownParser({ plugins: [charts()] });
    const document = await parse(
      `::chart{title="Bundle size"}
${sizes.trim()}

:::annotation{at="annotate" mark="circle"}
The largest package.
:::
::`,
      { streaming: true },
    );
    expect(document.meta.issues).toEqual([]);
    expect(document.meta.issueRules).toEqual({});
    const html = await renderHtmlFromDocument(document, { components });
    expect(html).toContain('<svg role="img" aria-label="Bundle size"');
    expect(html).toContain('class="ca-mark ca-circle"');
    expect(html).toContain("The largest package.");
  });

  it("accepts Comark's metadata while streaming a Vega-Lite chart", async () => {
    const parse = createMarkdownParser({ plugins: [charts()] });
    const document = await parse(
      `::chart{title="Bundle size"}
${sizes.trim()}

\`\`\`vega-lite
{
  "mark": "bar",
  "encoding": {
    "x": { "field": "package", "type": "nominal" },
    "y": { "field": "size (kB)", "type": "quantitative" }
  }
}
\`\`\`
::`,
      { streaming: true },
    );
    expect(document.meta.issues).toEqual([]);
    expect(document.meta.issueRules).toEqual({});
    const html = await renderHtmlFromDocument(document, { components });
    expect(html).toContain('<figure class="cch" data-type="vega-lite">');
    expect(html).toContain('<svg role="img" aria-label="Bundle size"');
    expect(html).toContain("<td>annotate</td>");
  });

  it("draws an SVG over the table it came from, and inlines the styles once", async () => {
    const html = await render(`${chart(sizes, '{title="Bundle size"}')}\n\n${chart(months)}`);
    expect(html).toContain(
      '<figure class="cch" data-type="bar"><figcaption>Bundle size</figcaption><div class="cch-plot"><svg role="img" aria-label="Bundle size" xmlns="http://www.w3.org/2000/svg"',
    );
    // Bars are the default, whatever x holds.
    expect(html).toContain(
      '<figure class="cch" data-type="bar"><div class="cch-plot"><svg role="img" aria-label="bar chart of before, after by month"',
    );
    expect(html).toContain('<details class="cch-data"><summary>Data</summary><table>');
    expect(html).toContain("<td>annotate</td>");
    expect(html.match(/<style data-comark-charts>/g)).toHaveLength(1);
    expect(await issues(chart(sizes))).toEqual([]);
  });

  it("takes the card's side padding from --cch-padding, which the Data footer spans too", async () => {
    const html = await render(chart(sizes));
    expect(html).toContain(":where(.cch){--cch-padding:1.5rem}");
    expect(html).toMatch(/\.cch\{[^}]*padding:1\.25rem var\(--cch-padding\) 0;/);
    expect(html).toMatch(
      /\.cch-data\{margin:1rem calc\(-1 \* var\(--cch-padding\)\) 0;padding:\.75rem var\(--cch-padding\);/,
    );
  });

  it("labels the chart with the table's own headers, dots and all", async () => {
    const html = await render(
      chart(`
| phase | v0.1 | v0.2 |
| --- | --- | --- |
| parse | 120 | 80 |
| render | 160 | 102 |`),
    );
    expect(html).toContain(">v0.1</text>");
    expect(html).toContain(">v0.2</text>");
    expect(html).toContain(">parse</text>");
  });

  it("draws the columns `x` and `y` name, as a line, an area, or a pie", async () => {
    const line = await render(chart(months, '{type="line" x="month" y="after"}'));
    expect(line).toContain('aria-label="line chart of after by month"');
    expect(line).not.toContain(">before</text>");
    expect(await render(chart(months, '{type="area"}'))).toContain('data-type="area"');
    const pie = await render(chart(sizes, '{type="pie"}'));
    expect(pie).toContain('data-type="pie"');
    expect(pie).toContain(">annotate</text>");
  });

  it("stacks bars, plots numbers against numbers, joins before and after, and walks a total", async () => {
    const stacked = await render(
      chart(
        `
| page | js | css |
| --- | --- | --- |
| home | 120 | 18 |
| docs | 95 | 22 |`,
        '{type="stacked"}',
      ),
    );
    expect(stacked).toContain('data-type="stacked"');
    expect(stacked).toContain(">css</text>");
    const scatter = await render(
      chart(
        `
| size (kB) | load (ms) |
| --- | --- |
| 40 | 210 |
| 120 | 410 |`,
        '{type="scatter"}',
      ),
    );
    expect(scatter).toContain('data-type="scatter"');
    expect(scatter).toContain(">size (kB)</text>");
    const dumbbell = await render(chart(months, '{type="dumbbell"}'));
    expect(dumbbell).toContain('data-type="dumbbell"');
    expect(dumbbell).toContain(">before</text>");
    expect(dumbbell).toContain(">after</text>");
    // Months are rows like any name, each with its own connector rather than one line through them all.
    expect(dumbbell.match(/class="mark-line role-mark/g)).toHaveLength(3);
    const waterfall = await render(
      chart(
        `
| step | size |
| --- | --- |
| main | 412 |
| add charts | 38 |
| drop moment | -24 |
| this PR | 426 |`,
        '{type="waterfall" labels}',
      ),
    );
    expect(waterfall).toContain('data-type="waterfall"');
    expect(waterfall).toContain(">increase</text>");
    expect(waterfall).toContain(">decrease</text>");
    // With `labels`, each step prints its change and each total its value, once.
    for (const value of ["412", "+38", "\u221224", "426"])
      expect(waterfall.split(`>${value}</text>`)).toHaveLength(2);
  });

  it("grids a dumbbell, ends its axis at the data, and prints each row's ends beside its dots", async () => {
    const html = await render(
      chart(
        `
| activity | before | after |
| --- | --: | --: |
| waiting for review | 820 | 540 |
| debugging alone | 1,450 | 980 |
| meetings about bugs | 2,100 | 1,320 |
| standup | 380 | 160 |`,
        '{type="dumbbell" labels}',
      ),
    );
    const group = (role: string) =>
      [...html.matchAll(new RegExp(`class="mark-[a-z]+ role-${role}"[^>]*>(.*?)</g>`, "gs"))].map(
        ([, inside]) => inside!,
      );
    const [ticks, names] = group("axis-label");
    expect([...ticks!.matchAll(/>([^<]+)<\/text>/g)].map(([, text]) => text)).toEqual([
      "0",
      "300",
      "600",
      "900",
      "1,200",
      "1,500",
      "1,800",
      "2,100",
    ]);
    expect(names).toContain(">standup</text>");
    // A grid line at every tick and a guide along every row.
    const [columns, rows] = group("axis-grid");
    expect(columns!.match(/<line/g)).toHaveLength(8);
    expect(rows!.match(/<line[^>]*stroke-width="1"/g)).toHaveLength(4);
    const printed = [...html.matchAll(/class="mark-text role-mark[^"]*"[^>]*>(.*?)<\/g>/gs)]
      .flatMap(([, inside]) => [...inside!.matchAll(/<text[^>]*>([^<]+)<\/text>/g)])
      .map(([, text]) => text);
    expect(printed.sort()).toEqual(
      ["1,320", "1,450", "160", "2,100", "380", "540", "820", "980"].sort(),
    );
  });

  it("keeps an equal dumbbell value on its expanded axis", async () => {
    const html = await render(
      chart(
        `
| activity | before | after |
| --- | --: | --: |
| waiting | 100 | 100 |
| done | 100 | 100 |`,
        '{type="dumbbell"}',
      ),
    );
    const axis = [...html.matchAll(/class="mark-text role-axis-label"[^>]*>(.*?)<\/g/gs)]
      .flatMap(([, inside]) => [...inside!.matchAll(/<text[^>]*>([^<]+)<\/text>/g)])
      .map(([, text]) => text);
    expect(axis).toContain("100");
  });

  it("names every month, with the year on the first and wherever it turns", async () => {
    const html = await render(
      chart(
        `
| month | commits |
| --- | --: |
| 2026-10 | 610 |
| 2026-11 | 640 |
| 2026-12 | 652 |
| 2027-01 | 715 |
| 2027-02 | 720 |
| 2027-03 | 768 |
| 2027-04 | 760 |`,
        '{type="line"}',
      ),
    );
    const labels = [...html.matchAll(/>([A-Z][a-z]{2}(?: \d{4})?)<\/text>/g)].map(
      ([, label]) => label,
    );
    expect(labels).toEqual(["Oct 2026", "Nov", "Dec", "Jan 2027", "Feb", "Mar", "Apr"]);
  });

  it("turns bars sideways with `horizontal`, keeping every label whole", async () => {
    const label = "packages/annotate/test/diff.test.ts › renders rows";
    const table = `| test | s |\n| --- | --- |\n| ${label} | 1.3 |\n| zoom | 5.1 |`;
    const html = await render(chart(table, "{horizontal}"));
    expect(html).toContain(`>${label}</text>`);
    // Upright, the default, a long name wraps under its bar instead.
    expect(await render(chart(table))).not.toContain(`>${label}</text>`);
    const [, width] = /viewBox="0 0 ([\d.]+) /.exec(html) ?? [];
    expect(Number(width)).toBeLessThanOrEqual(700);
  });

  it("draws comark-annotate marks on the row and series an annotation names", async () => {
    const markdown = `::chart{title="Build time"}
${months.trim()}
:::annotation{at="2026-05" series="before" mark="circle" color="red"}
The slow month.
:::
:::annotation{at="2026-06" side="top" mark="none"}
Cache on.
:::
::`;
    const both = [charts(), annotate()];
    expect((await parseMarkdown(markdown, { plugins: both })).meta.issues).toEqual([]);
    const html = await createHtmlRenderer({
      plugins: both,
      components: { ...annotateComponents, ...components },
    })(markdown);
    expect(html).toContain('<div class="cch-plot cch-marked">');
    expect(html).toMatch(
      /<span class="ca-mark ca-circle[^"]*" data-n="1"[^>]*left:[\d.]+%;top:[\d.]+%/,
    );
    expect(html).toContain('class="ca-callout ca-callout-top"');
    expect(html).toContain("The slow month.");
    // The data stays the table, marks or not.
    expect(html).toContain('<details class="cch-data"><summary>Data</summary><table>');
  });

  it("draws a bar worth zero as a faded stroke at its base", async () => {
    const steps = `
| step | cache miss | cache hit |
| --- | --: | --: |
| Client build | 8.8 | 0 |
| Restore from cache | 0 | 0.2 |
| Nitro | 44.6 | 37.4 |`;
    const zeros = (html: string) => html.match(/fill-opacity="0.5"/g)?.length ?? 0;
    expect(zeros(await render(chart(steps)))).toBe(2);
    expect(zeros(await render(chart(steps, '{type="stacked"}')))).toBe(0);
    expect(zeros(await render(chart(sizes)))).toBe(0);
  });

  it("rings a row of bars with its values and its name", async () => {
    const html = await createHtmlRenderer({
      plugins: [charts(), annotate()],
      components: { ...annotateComponents, ...components },
    })(`::chart{horizontal labels}
| step | cache miss | cache hit |
| --- | --: | --: |
| Client build | 8.8 | 0 |
| Server build | 8.8 | 0 |
| Restore from cache | 0 | 0.2 |
| Nitro | 44.6 | 37.4 |
:::annotation{at="Nitro" mark="circle"}
Runs on every build.
:::
::`);
    const svg = /<svg role="img"[\s\S]*?<\/svg>/.exec(html)?.[0] ?? "";
    const [width = 0, height = 0] = (/viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(svg) ?? [])
      .slice(1)
      .map(Number);
    // Each text sits at its own translation plus those of every group around it.
    const texts = new Map<string, { x: number; y: number; end: boolean }>();
    const groups = [{ x: 0, y: 0 }];
    for (const [tag, close, name, text] of svg.matchAll(/<(\/?)(\w+)[^>]*>([^<]*)/g)) {
      const [dx = 0, dy = 0] = (/translate\(([-\d.]+),([-\d.]+)\)/.exec(tag) ?? [])
        .slice(1)
        .map(Number);
      const { x, y } = groups.at(-1)!;
      if (name === "g" && close) groups.pop();
      else if (name === "g") groups.push({ x: x + dx, y: y + dy });
      else if (name === "text")
        texts.set(text!, { x: x + dx, y: y + dy, end: tag.includes('text-anchor="end"') });
    }
    const [left = 0, top = 0, w = 0, h = 0] = (
      /class="ca-mark ca-circle"[^>]*left:([\d.]+)%;top:([\d.]+)%;width:([\d.]+)%;height:([\d.]+)%/.exec(
        html,
      ) ?? []
    )
      .slice(1)
      .map(Number);
    const box = {
      x1: (left / 100) * width,
      y1: (top / 100) * height,
      x2: ((left + w) / 100) * width,
      y2: ((top + h) / 100) * height,
    };
    // The row's name ends where it's anchored, and a value printed past its bar starts there.
    const name = texts.get("Nitro")!;
    const value = texts.get("37.4")!;
    expect(name.end).toBe(true);
    expect(box.x1).toBeLessThan(name.x - 30);
    expect(box.x2).toBeGreaterThan(value.x + 20);
    for (const { y } of [name, value]) {
      expect(box.y1).toBeLessThan(y);
      expect(box.y2).toBeGreaterThan(y);
    }
    expect(texts.get("0.2")!.y).toBeLessThan(box.y1);
  });

  it("centers a mark on the point it names", async () => {
    const html = await createHtmlRenderer({
      plugins: [charts(), annotate()],
      components: { ...annotateComponents, ...components },
    })(`::chart{type="scatter"}
| pigeons | deploys |
| --: | --: |
| 2 | 1 |
| 5 | 3 |
| 9 | 4 |
:::annotation{at="5" mark="circle"}
The second point.
:::
::`);
    const svg = /<svg role="img"[\s\S]*?<\/svg>/.exec(html)?.[0] ?? "";
    const [width = 0, height = 0] = (/viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(svg) ?? [])
      .slice(1)
      .map(Number);
    // Each point sits at its own translation plus those of every group around it.
    const points: number[][] = [];
    const groups = [{ x: 0, y: 0, symbols: false }];
    for (const [tag, close, name] of svg.matchAll(/<(\/?)(\w+)[^>]*>/g)) {
      const [dx = 0, dy = 0] = (/translate\(([-\d.]+),([-\d.]+)\)/.exec(tag) ?? [])
        .slice(1)
        .map(Number);
      const { x, y, symbols } = groups.at(-1)!;
      if (name === "g" && close) groups.pop();
      else if (name === "g")
        groups.push({ x: x + dx, y: y + dy, symbols: tag.includes("mark-symbol") });
      else if (name === "path" && symbols) points.push([x + dx, y + dy]);
    }
    const [left = 0, top = 0, w = 0, h = 0] = (
      /class="ca-mark ca-circle"[^>]*left:([\d.]+)%;top:([\d.]+)%;width:([\d.]+)%;height:([\d.]+)%/.exec(
        html,
      ) ?? []
    )
      .slice(1)
      .map(Number);
    expect(points).toHaveLength(3);
    expect(((left + w / 2) / 100) * width).toBeCloseTo(points[1]![0]!, 0);
    expect(((top + h / 2) / 100) * height).toBeCloseTo(points[1]![1]!, 0);
  });

  it("places chart stamps using the SVG aspect ratio", async () => {
    const markdown = `::chart{type="pie"}
| name | n |
| --- | --- |
| a | 1 |
| b | 2 |
:::annotation{at="a" mark="circle"}
The first slice.
:::
::`;
    const html = await createHtmlRenderer({
      plugins: [charts(), annotate()],
      components: { ...annotateComponents, ...components },
    })(markdown);
    expect(html).toContain('viewBox="0 0 544 397"');
    expect(html).toContain('ca-stamp" style="left:0;top:0;translate:-50% -50%"');
  });

  it("reports an annotation that points at no row or series", async () => {
    const markdown = `::chart
${months.trim()}
:::annotation{at="2026-13" x=10}
Nowhere.
:::
:::annotation{at="2026-05" series="during"}
No such column.
:::
:::annotation
:::
::`;
    expect(await issues(markdown)).toEqual([
      '`::chart` 1, annotation 1: `x` isn\'t a prop of an annotation in a chart. Point at a row with `at`, and a column with `series`, or cross the plot with `mark="line"` at a number with `value`.',
      '`::chart` 1, annotation 1: `at="2026-13"` isn\'t a `month` in the table. Copy it from the table, such as `2026-04`, `2026-05`, `2026-06`.',
      '`::chart` 1, annotation 2: `series="during"` isn\'t a column the chart draws. Use `before` or `after`, or leave it out to mark the whole row.',
      "`::chart` 1, annotation 3: write a note explaining what the mark points at.",
      "`::chart` 1, annotation 3: `at` is required: the `month` of the row it marks, one of `2026-04`, `2026-05`, `2026-06`.",
    ]);
    const html = await render(markdown);
    expect(html.match(/class="ca-mark /g)).toHaveLength(1);
  });

  it("reports a mark on an empty cell, which it can't draw", async () => {
    const markdown = `::chart
| pond | ducks | geese |
| --- | --: | --: |
| north | 12 | 3 |
| south | 7 | |
| east | | |
:::annotation{at="south" series="geese"}
Nobody counted the geese.
:::
:::annotation{at="east"}
Nobody counted at all.
:::
:::annotation{at="south"}
The ducks are still drawn.
:::
::`;
    expect(await issues(markdown)).toEqual([
      '`::chart` 1, annotation 1: `at="south"` marks an empty `geese` cell, so the mark isn\'t drawn. Fill in the cell, or mark another row.',
      '`::chart` 1, annotation 2: `at="east"` marks a row with no numbers, so the mark isn\'t drawn. Fill in the row, or mark another one.',
    ]);
  });

  it("names the rule of each issue in meta.issueRules", async () => {
    const markdown = `${chart(sizes, '{type="donut" colour="red"}')}

::chart
${months.trim()}
:::annotation{at="2026-13" color="purple"}
Nowhere.
:::
::

::chart
${sizes.trim()}

\`\`\`vega-lite
{"data": {"values": []}, "mark": "bar"}
\`\`\`
::`;
    const { meta } = await parseMarkdown(markdown, { plugins: [charts({ draw: false })] });
    expect(Object.values(meta.issueRules)).toEqual([
      "comark/charts/unknown-prop",
      "comark/charts/unknown-type",
      "comark/annotate/invalid-color",
      "comark/charts/invalid-at",
      "comark/charts/spec-with-data",
    ]);
    expect(Object.keys(meta.issueRules)).toEqual(meta.issues);
  });

  it("escapes text from the table in the SVG", async () => {
    const html = await render(
      chart(`
| name | n |
| --- | --- |
| a & "b" \\<i\\> | 1 |
| c | 2 |`),
    );
    expect(html).not.toContain("<i>");
    expect(html).toContain("a &amp; ");
  });

  it("reports each problem, naming the block and the fix, and still draws what it can", async () => {
    const markdown = [
      chart(sizes, '{type="donut" colour="red"}'),
      chart(months, '{y="befor"}'),
      chart(`
| package | size |
| --- | --- |
| annotate | 41 kB |
| zoom | 18 |`),
      chart(months, '{type="pie"}'),
      "::chart\nJust text.\n::",
      chart(sizes, '{type="scatter"}'),
      chart(sizes, '{type="dumbbell"}'),
      chart(months, '{type="waterfall"}'),
    ].join("\n\n");
    expect(await issues(markdown)).toEqual([
      "`::chart` 1: `colour` isn't a prop of `::chart`. Valid props: type, x, y, title, labels, horizontal.",
      '`::chart` 1: `type="donut"` isn\'t a chart type. Use `bar`, `stacked`, `line`, `area`, `scatter`, `dumbbell`, `waterfall`, `pie` or `gantt`.',
      '`::chart` 2: `y` names column `befor`, but its table has `month`, `before` and `after`. Separate several with commas, as in `y="before, after"`.',
      "`::chart` 3: row 1 has `41 kB` in `size`, which isn't a number. Write the number alone, such as `1200` or `1,200`, and put the unit in the header, such as `size (ms)`.",
      '`::chart` 4: a pie shows one column of numbers, and this one has `before` and `after`. Name one with `y`, or use `type="bar"`.',
      "`::chart` 5 has no table to draw. Put a Markdown table between `::chart` and `::`: a header row, then one row per point.",
      '`::chart` 6: a scatter plot needs numbers in `package`, its `x`. Use `type="bar"`, or make `x` a column of numbers.',
      '`::chart` 7: a dumbbell joins two or more columns of numbers per row, such as `before` and `after`, and this one has `size (kB)`. Add a column, or use `type="bar"`.',
      '`::chart` 8: a waterfall shows one column of numbers, and this one has `before` and `after`. Name one with `y`, or use `type="bar"`.',
      "`::chart` 8: a waterfall's last row is its end total, and `2026-06` is 990 while `2026-04` and the changes after it add up to 1840. Fix the total, add the missing change, or end the table with a total row of 1840.",
    ]);
    const html = await render(markdown);
    // An unknown or unfit type draws bars, a bad cell is left out, and a pie or a waterfall draws its
    // first column. A missing column leaves nothing to draw.
    expect(html.match(/<svg role="img"/g)).toHaveLength(6);
    expect(html).toContain("Just text.");
  });

  it("reports a repeated x, a line of one row, and a pie of zeros, and draws bars instead", async () => {
    const markdown = [
      chart(
        `| month | ms |\n| --- | --- |\n| 2026-04 | 820 |\n| 2026-05 | 890 |\n| 2026-04 | 905 |`,
      ),
      chart(`| month | ms |\n| --- | --- |\n| 2026-04 | 820 |`, '{type="line"}'),
      chart(`| name | n |\n| --- | --- |\n| a | 0 |\n| b | |`, '{type="pie"}'),
    ].join("\n\n");
    expect(await issues(markdown)).toEqual([
      "`::chart` 1: rows 1 and 3 both have `2026-04` in `month`. Give each row its own `month`, or add the rows up into one.",
      '`::chart` 2: a line needs at least two rows to draw, and this one has one. Add a row, or use `type="bar"`.',
      '`::chart` 3: a pie of `n` has nothing to divide, since every number is 0 or empty. Use `type="bar"`, or check the numbers.',
    ]);
    // The first is bars too, since bars are the default.
    expect((await render(markdown)).match(/data-type="bar"/g)).toHaveLength(3);
  });

  it("gives every grouped bar over dates its own lane", async () => {
    const html = await render(
      chart(
        `
| year | before | after | p95 | p99 | mobile | desktop |
| --- | --: | --: | --: | --: | --: | --: |
| 2015 | 20 | 10 | 7 | 9 | 4 | 12,000 |
| 2016 | 10 | 12 | 18 | 19 | 9 | 19 |`,
        '{type="bar"}',
      ),
    );
    const bars = [...html.matchAll(/<path d="(M[^"]*)" fill="#[0-9a-f]{6}"/g)].map(([, d]) => d);
    expect(bars).toHaveLength(12);
    expect(bars.filter((d) => /^M[\d.]+,[\d.]+h0v/.test(d))).toEqual([]);
  });

  const build = `
| step | start | end |
| --- | --: | --: |
| Nuxt starts | 0 | 1.12 |
| Browser compile | 1.12 | 4.79 |
| Server compile | 4.81 | 8.93 |
| Hand over | 8.93 | 8.93 |
| Nitro bundle | 8.95 | 10.89 |`;
  // The text of each group with a role, such as each axis's labels, in the order the SVG draws them.
  const texts = (html: string, role: string) =>
    [...html.matchAll(new RegExp(`class="mark-text role-${role}[^"]*"[^>]*>(.*?)</g>`, "gs"))].map(
      ([, inside]) => [...inside!.matchAll(/<text[^>]*>([^<]+)<\/text>/g)].map(([, text]) => text),
    );
  const axes = (html: string) => {
    const [ticks = [], names = []] = texts(html, "axis-label");
    return { ticks, names };
  };
  const durations = (html: string) => texts(html, "mark").flat();

  it("draws a gantt top to bottom in table order, with each bar's duration and a diamond for a milestone", async () => {
    const html = await render(chart(build, '{type="gantt" labels}'));
    expect(await issues(chart(build, '{type="gantt" labels}'))).toEqual([]);
    expect(html).toContain(
      '<figure class="cch" data-type="gantt"><div class="cch-plot"><svg role="img" aria-label="gantt chart of step, from start to end"',
    );
    const { ticks, names } = axes(html);
    expect(names).toEqual([
      "Nuxt starts",
      "Browser compile",
      "Server compile",
      "Hand over",
      "Nitro bundle",
    ]);
    // The timeline starts where the data does, rather than padded back past 0.
    expect(ticks[0]).toBe("0");
    expect(ticks).not.toContain("−2");
    expect(durations(html)).toEqual(["1.12", "3.67", "4.12", "1.94"]);
    expect(html.match(/class="mark-symbol role-mark/g)).toHaveLength(1);
    // Without `labels`, the bars print no durations, and keep their names and milestone.
    const bare = await render(chart(build, '{type="gantt"}'));
    expect(durations(bare)).toEqual([]);
    expect(axes(bare).names).toEqual(names);
    expect(bare.match(/class="mark-symbol role-mark/g)).toHaveLength(1);
  });

  it("colors a gantt's bars by its column of names, where a task may repeat", async () => {
    const markdown = chart(
      `
| step | run | start | end |
| --- | --- | --: | --: |
| compile | before | 0 | 4.1 |
| bundle | before | 4.1 | 6 |
| compile | after | 0 | 2.2 |
| bundle | after | 2.2 | 3.9 |`,
      '{type="gantt"}',
    );
    expect(await issues(markdown)).toEqual([]);
    const html = await render(markdown);
    expect(html).toContain(">before</text>");
    expect(html).toContain(">after</text>");
    expect(axes(html).names).toEqual(["compile", "bundle", "compile", "bundle"]);
    const fills = [...html.matchAll(/class="mark-rect role-mark[^"]*"[^>]*>(.*?)<\/g>/gs)]
      .flatMap(([, inside]) => [...inside!.matchAll(/fill="(#[0-9a-f]{6})"/g)])
      .map(([, fill]) => fill);
    expect(new Set(fills).size).toBe(2);
  });

  it("reads a gantt's dates in UTC, ticks in the table's unit, and prints durations in it", async () => {
    const days = chart(
      `
| task | start | end |
| --- | --- | --- |
| Design | 2026-10-01 | 2026-10-08 |
| Build | 2026-10-12 | 2026-11-02 |
| Release | 2026-11-09 | 2026-11-10 |`,
      '{type="gantt" labels}',
    );
    const hours = chart(
      `
| job | start | end |
| --- | --- | --- |
| Backup | 2026-10-24T01:00 | 2026-10-24T02:30 |
| Migrate | 2026-10-24 02:30 | 2026-10-24T03:10 |`,
      '{type="gantt" labels}',
    );
    const years = chart(
      `
| version | release | end of life |
| --- | --- | --- |
| Node 22 | 2024 | 2027 |
| Node 24 | 2025 | 2028 |`,
      '{type="gantt" labels}',
    );
    expect(await issues([days, hours, years].join("\n\n"))).toEqual([]);
    const day = await render(days);
    expect(durations(day)).toEqual(["7d", "21d", "1d"]);
    // Weeks start on a Monday, and the year shows on the first tick.
    expect(axes(day).ticks).toEqual(["Sep 28, 2026", "Oct 12", "Oct 26", "Nov 9", "Nov 23"]);
    const hour = await render(hours);
    expect(durations(hour)).toEqual(["1.5h", "40min"]);
    expect(axes(hour).ticks).toEqual([
      "Oct 24, 01:00",
      "01:30",
      "02:00",
      "02:30",
      "03:00",
      "03:30",
    ]);
    const year = await render(years);
    expect(durations(year)).toEqual(["3y", "3y"]);
    expect(axes(year).ticks).toEqual(["2024", "2025", "2026", "2027", "2028"]);
    // Too short a span for three ticks keeps its ends in the table's unit.
    const short = await render(
      chart(
        `| version | release | end of life |\n| --- | --- | --- |\n| Node 25 | 2025 | 2026 |`,
        '{type="gantt"}',
      ),
    );
    expect(axes(short).ticks).toEqual(["2025", "2026"]);
    // A time with no zone is UTC, whichever zone draws it.
    const zone = process.env.TZ;
    process.env.TZ = "Pacific/Kiritimati";
    try {
      expect(await render(hours)).toBe(hour);
    } finally {
      if (zone === undefined) delete process.env.TZ;
      else process.env.TZ = zone;
    }
  });

  it("marks a gantt's bar by its task, and by its group where the task repeats", async () => {
    const markdown = `::chart{type="gantt"}
| step | run | start | end |
| --- | --- | --: | --: |
| compile | before | 0 | 4.1 |
| compile | after | 0 | 2.2 |
:::annotation{at="compile" series="after" mark="circle" color="green"}
Twice as fast.
:::
:::annotation{at="compile" mark="cross"}
Which one?
:::
:::annotation{at="compile" series="during"}
No such run.
:::
::`;
    const plugins = [charts(), annotate()];
    expect((await parseMarkdown(markdown, { plugins })).meta.issues).toEqual([
      '`::chart` 1, annotation 2: `at="compile"` names a row in `before` and `after`. Add `series` with the `run` of the one it marks.',
      '`::chart` 1, annotation 3: `series="during"` isn\'t a `run` in the table. Use `before` or `after`, or leave it out.',
    ]);
    const html = await createHtmlRenderer({
      plugins,
      components: { ...annotateComponents, ...components },
    })(markdown);
    expect(html.match(/class="ca-mark /g)).toHaveLength(3);
    expect(html).toContain("Twice as fast.");
  });

  it("reports a gantt's problems, naming the row and the fix", async () => {
    const markdown = [
      chart(`| step | took |\n| --- | --: |\n| build | 4 |`, '{type="gantt"}'),
      chart(
        `| step | start | end | took |\n| --- | --: | --: | --: |\n| build | 0 | 4 | 4 |`,
        '{type="gantt"}',
      ),
      chart(
        `| step | start | end |\n| --- | --: | --: |\n| build | 0 | 4 |`,
        '{type="gantt" y="end"}',
      ),
      chart(
        `
| step | run | owner | start | end |
| --- | --- | --- | --: | --: |
| build | before | ci | 0 | 4 |
| test | before | ci | 4 | soon |
| lint | before | ci | 2 | |
| deploy | before | ci | 9 | 6 |
| build | before | ci | 1 | 2 |`,
        '{type="gantt"}',
      ),
      chart(
        `| step | start | end |\n| --- | --- | --- |\n| plan | 2026-02-30 | 2026-03-02 |\n| ship | 2026-03-02 | 2026-03-09 |`,
        '{type="gantt"}',
      ),
      chart(
        `| step | start | end |\n| --- | --- | --- |\n| deploy | 2026-10-24 | 2026-10-20 |`,
        '{type="gantt"}',
      ),
    ].join("\n\n");
    expect(await issues(markdown)).toEqual([
      "`::chart` 1: a gantt draws each row from its start to its end, two columns of numbers or dates, and its table has one, `took`. Add a column for where each row starts and one for where it ends.",
      '`::chart` 2: a gantt draws each row from its start to its end, two columns of numbers or dates, and its table has 3, `start`, `end` and `took`. Name the two with `y`, as in `y="start, end"`. To color the bars by one of the others, such as a shard, write it as names, like `shard 1`.',
      '`::chart` 3: `y` names a gantt\'s start and end columns, and it names one, `end`. Name two, as in `y="start, end"`.',
      "`::chart` 4: a gantt colors its bars by one column of names, and its table has `run` and `owner`. Keep `run`, and move the others out of the table.",
      "`::chart` 4: row 2 has `soon` in `end`, which isn't a number like the other starts and ends. Write every start and end as a number, such as `1.5` or `1,200`, or every one as a date, such as `2026-04-15` or `2026-04-15T09:30`.",
      "`::chart` 4: row 3 has no `end`, so its bar isn't drawn. Fill it in; for a milestone, give it the same `end` as its `start`.",
      "`::chart` 4: row 4 ends at `6`, before it starts at `9`. Swap them, or fix the `end`.",
      "`::chart` 4: rows 1 and 5 both have `build` in `step` and `before` in `run`. Give each row its own `step` within a `run`.",
      // Date.parse alone would read February 30 as March 2.
      "`::chart` 5: row 1 has `2026-02-30` in `start`, which isn't a date like the other starts and ends. Write every start and end as a number, such as `1.5` or `1,200`, or every one as a date, such as `2026-04-15` or `2026-04-15T09:30`.",
      "`::chart` 6: row 1 ends at `2026-10-20`, before it starts at `2026-10-24`. Swap them, or fix the `end`.",
    ]);
    // Without a start and an end there's nothing to draw, and the rest still draw. A bar that ends before it starts
    // isn't drawn either, so a chart of only that one shows its table.
    const html = await render(markdown);
    expect(html.match(/<svg role="img"/g)).toHaveLength(2);
    expect(html).toContain("<td>deploy</td>");
    expect(
      await issues(
        chart(
          `| step | start | end | took |\n| --- | --: | --: | --: |\n| build | 0 | 4 | 4 |`,
          '{type="gantt" y="start, end"}',
        ),
      ),
    ).toEqual([]);
  });

  it("writes each value inside its bar with `labels`, or past the bar's end where it doesn't fit", async () => {
    const value = (html: string, text: string) =>
      new RegExp(`<text [^>]*font-weight="500" fill="(#[0-9a-f]+)">${text}</text>`).exec(html)?.[1];
    const bars = await render(
      chart(
        `
| team | ducks |
| --- | --: |
| backend | 41 |
| frontend | 18 |
| ops | 2 |`,
        "{labels}",
      ),
    );
    expect(value(bars, "41")).toBe("#ffffff");
    expect(value(bars, "18")).toBe("#ffffff");
    expect(value(bars, "2")).toBe("#0a0a0a");
    const stacked = await render(
      chart(
        `
| day | work | weekend | pigeons |
| --- | --: | --: | --: |
| Monday | 1 | 110 | 40 |
| Friday | 20 | 140 | 2 |`,
        '{type="stacked" labels}',
      ),
    );
    expect(value(stacked, "110")).toBe("#ffffff");
    expect(value(stacked, "40")).toBe("#ffffff");
    // The first series stacks on top. A thin segment at the end of its stack goes past it; one at the bottom has
    // nowhere to go.
    expect(value(stacked, "1")).toBe("#0a0a0a");
    expect(value(stacked, "2")).toBeUndefined();
    const sideways = await render(
      chart(
        `
| first comment | minutes |
| --- | --: |
| nit: this file uses tabs and the rest of the repo uses spaces | 1,284 |
| why does the deploy script check for pigeons | 3 |`,
        "{horizontal labels}",
      ),
    );
    expect(value(sideways, "1,284")).toBe("#ffffff");
    expect(value(sideways, "3")).toBe("#0a0a0a");
    expect(await issues(chart(sizes, '{type="stacked" labels}'))).toEqual([]);
  });

  it("reports `labels` and `horizontal` on a chart that doesn't take them", async () => {
    expect(
      await issues(
        [
          chart(months, '{type="line" labels}'),
          chart(sizes, '{labels="inside"}'),
          chart(months, '{type="dumbbell" horizontal}'),
          chart(months, '{type="area" horizontal}'),
          chart(sizes, '{labels="false"}'),
          chart(sizes, '{horizontal="yes"}'),
          chart(
            `| step | start | end |\n| --- | --: | --: |\n| build | 0 | 4 |`,
            '{type="gantt" labels}',
          ),
          chart(months, '{type="waterfall" y="after" labels}'),
        ].join("\n\n"),
      ),
    ).toEqual([
      '`::chart` 1: `labels` prints each number on its bar, step, or dot, and a line has none. Remove it, or use `type="bar"`.',
      '`::chart` 2: `labels` takes no value. Write `labels` alone, as in `::chart{type="bar" labels}`.',
      "`::chart` 3: a dumbbell always runs sideways, so `horizontal` changes nothing. Remove it.",
      '`::chart` 4: `horizontal` turns bars sideways, and an area has no bars to turn. Remove it, or use `type="bar"`.',
      '`::chart` 6: `horizontal` takes no value. Write `horizontal` alone, as in `::chart{type="bar" horizontal}`.',
      "`::chart` 8: a waterfall's last row is its end total, and `2026-06` is 640 while `2026-04` and the changes after it add up to 1208. Fix the total, add the missing change, or end the table with a total row of 1208.",
    ]);
  });

  it("draws a waterfall's first and last rows as totals, and reports an end total that doesn't add up", async () => {
    const waterfall = (end: string) =>
      chart(
        `| step | ducks |\n| --- | --: |\n| July | 41 |\n| bulk order | 12 |\n| taken home | -4 |\n| October | ${end} |`,
        '{type="waterfall" labels}',
      );
    expect(await issues(waterfall("49"))).toEqual([]);
    expect(await issues(waterfall("-3"))).toEqual([
      "`::chart` 1: a waterfall's last row is its end total, and `October` is -3 while `July` and the changes after it add up to 49. Fix the total, add the missing change, or end the table with a total row of 49.",
    ]);
    // The end is still a total, so the start and the end are the only bars in the totals' color.
    const totals = (html: string) => html.match(/<path d="M[^"]*" fill="#737373"/g)?.length;
    expect(totals(await render(waterfall("-3")))).toBe(2);
  });

  it("crosses the plot with a line at a value, growing the axis to reach it", async () => {
    const marked = (annotation: string, table = sizes, props = "") =>
      `${chart(table, props).slice(0, -2)}${annotation}\n::`;
    const both = [charts(), annotate()];
    const draw = createHtmlRenderer({
      plugins: both,
      components: { ...annotateComponents, ...components },
    });
    const box = (html: string) =>
      /class="ca-mark ca-line"[^>]*left:([\d.]+)%;top:([\d.]+)%;width:([\d.]+)%;height:([\d.]+)%/
        .exec(html)!
        .slice(1)
        .map(Number);
    const line = (value: string, props = "") =>
      marked(
        `:::annotation{mark="line" value="${value}" side="right"}\nBudget.\n:::`,
        sizes,
        props,
      );
    for (const value of ["30", "90"])
      expect((await parseMarkdown(line(value), { plugins: both })).meta.issues).toEqual([]);
    // Across an upright chart, and higher up for a bigger value, even one past every bar.
    const [left, low, width, height] = box(await draw(line("30")));
    expect(width).toBeGreaterThan(80);
    expect(height).toBeLessThan(5);
    // It starts past the value axis's labels.
    expect(left).toBeLessThan(15);
    const [, high] = box(await draw(line("90")));
    expect(high).toBeLessThan(low!);
    expect(high).toBeGreaterThanOrEqual(0);
    expect(await draw(line("90"))).toContain('class="ca-callout ca-callout-right"');
    // Down a sideways one, whose values run across.
    const [, , across, down] = box(
      await draw(
        marked(
          ':::annotation{mark="line" value="50"}\nSLA.\n:::',
          `| first comment | minutes |\n| --- | --: |\n| nit: this file uses tabs and the rest of the repo uses spaces | 84 |\n| why does the deploy script check for pigeons | 47 |`,
          "{horizontal}",
        ),
      ),
    );
    expect(across).toBeLessThan(5);
    expect(down).toBeGreaterThan(50);
  });

  it("reports a line it can't place, naming the annotation and the fix", async () => {
    const marked = (annotation: string, table = sizes, props = "") =>
      `${chart(table, props).slice(0, -2)}${annotation}\n::`;
    expect(
      await issues(
        [
          marked(':::annotation{mark="line"}\nBudget.\n:::'),
          marked(':::annotation{mark="line" value="200ms"}\nBudget.\n:::'),
          marked(':::annotation{mark="line" value="30" at="zoom"}\nBudget.\n:::'),
          marked(':::annotation{at="zoom" value="30"}\nBudget.\n:::'),
          marked(':::annotation{mark="line" value="30"}\nBudget.\n:::', sizes, '{type="pie"}'),
        ].join("\n\n"),
      ),
    ).toEqual([
      '`::chart` 1, annotation 1: `mark="line"` needs `value`, the number on the value axis it crosses at, such as `value="200"`.',
      "`::chart` 2, annotation 1: `value=\"200ms\"` isn't a number. Write the number alone, such as `200` or `1,200`, in the unit of the chart's numbers.",
      "`::chart` 3, annotation 1: a line crosses the whole plot at its `value`, so `at` doesn't apply. Remove it.",
      '`::chart` 4, annotation 1: `value` places a line across the plot. Add `mark="line"`, or remove `value` and mark a row with `at`.',
      '`::chart` 5, annotation 1: `mark="line"` crosses the plot at a number on its value axis, and a pie has none. Mark a slice with `at` and another mark, such as `box`.',
    ]);
  });

  it("renders the content as it is when there's nothing to draw", async () => {
    const html = await render(chart(months, '{x="day"}'));
    expect(html).not.toContain("cch");
    expect(html).toContain("<td>2026-04</td>");
  });
});
