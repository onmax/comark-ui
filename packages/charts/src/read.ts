import type { ElementNode, Node } from "comark";
import type { Annotation } from "comark-annotate";
import { readMark } from "comark-annotate";
import { textContent } from "comark/utils";

export type ChartType =
  | "bar"
  | "stacked"
  | "line"
  | "area"
  | "scatter"
  | "dumbbell"
  | "waterfall"
  | "pie"
  | "gantt"
  | "sankey";

/** How the x values read: dates and numbers sit on a scale, anything else is a name. */
export type XKind = "year" | "month" | "date" | "time" | "number" | "name";

/** A chart as the plugin checked it and the renderer draws it. */
export interface Chart {
  type: Exclude<ChartType, "sankey">;
  title: string;
  /** The x column's header. */
  x: string;
  xKind: XKind;
  /** The headers of the columns drawn as series, in table order. */
  series: string[];
  /**
   * One row per table row: its x value and one number per series, or undefined for an empty or unreadable cell. A
   * gantt's are its start and end, and its group when it has a column of them.
   */
  rows: { x: string; values: (number | undefined)[]; group?: string }[];
  marks: ChartMark[];
  /** Whether the chart prints its numbers on its bars, steps, or dots, from `labels`. */
  labels?: boolean;
  /** Whether bars run sideways, from `horizontal`. Only bar and stacked bar charts take it. */
  horizontal?: boolean;
  /** How a gantt's starts and ends read: numbers, or dates kept as milliseconds since 1970 in UTC. */
  scale?: Exclude<XKind, "name">;
  /** The column of names a gantt colors its bars by. */
  group?: string;
}

/**
 * A comark-annotate annotation that points at data: the row whose x it names, and the series when it names one, or
 * for a `line`, the number on the value axis it crosses at. The renderer finds the box from the drawn chart.
 */
export interface ChartMark extends Omit<Annotation, "x" | "y" | "w" | "h"> {
  row?: number;
  series?: string;
  value?: number;
}

/** A sankey: flows between named nodes, one per row, each as wide as its amount. */
export interface FlowChart {
  type: "sankey";
  title: string;
  /** The headers of the columns a flow comes from, goes to, and its amount. */
  from: string;
  to: string;
  amount: string;
  /** Every node, in the order the table first names it; a mark's `row` is its index here. */
  nodes: string[];
  flows: { from: number; to: number; value: number }[];
  marks: ChartMark[];
  /** Whether each node prints its amount, from `labels`. */
  labels?: boolean;
}

/** A chart drawn from a Vega-Lite spec over the table: any chart Vega-Lite draws, with the table as its data. */
export interface SpecChart {
  type: "vega-lite";
  title: string;
  /** The table's headers, in order. */
  columns: string[];
  /** One object per row, keyed by header: a number where the cell reads as one, else its text, and null when empty. */
  values: Record<string, number | string | null>[];
  spec: Record<string, unknown>;
}

/**
 * One problem with a chart, and the comark-linter rule it falls under. comark-annotate checks an annotation's mark,
 * color, side, and note, so those come under its rules, as they do on a screenshot.
 */
export type Issue =
  | { rule: `comark/charts/${string}`; message: string }
  | Parameters<typeof readMark>[2][number];

export const TYPES: readonly ChartType[] = [
  "bar",
  "stacked",
  "line",
  "area",
  "scatter",
  "dumbbell",
  "waterfall",
  "pie",
  "gantt",
  "sankey",
];
// A bare `{labels}` arrives as `:labels="true"`, Comark's spelling of a prop with no value.
const PROPS = new Set([
  "type",
  "x",
  "y",
  "title",
  "labels",
  ":labels",
  "horizontal",
  ":horizontal",
  "class",
  "id",
]);
const MARK_PROPS = new Set(["at", "series", "value", "mark", "color", "side", "class", "id"]);
const A: Record<ChartType, string> = {
  bar: "a bar chart",
  stacked: "a stacked bar chart",
  line: "a line",
  area: "an area",
  scatter: "a scatter plot",
  dumbbell: "a dumbbell",
  waterfall: "a waterfall",
  pie: "a pie",
  gantt: "a gantt",
  sankey: "a sankey",
};

const KINDS: [XKind, RegExp][] = [
  ["year", /^\d{4}$/],
  ["month", /^\d{4}-\d{2}$/],
  ["date", /^\d{4}-\d{2}-\d{2}$/],
  ["time", /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?$/],
];
// Commas only as thousands separators, so `1,200` reads as 1200 and `1,5` is rejected rather than misread.
const NUMBER = /^[+-]?(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/;

const isElement = (node: Node): node is ElementNode => Array.isArray(node) && node[0] !== null;
const childrenOf = ([, , ...rest]: ElementNode): Node[] => rest;
const isContent = (node: Node) => (Array.isArray(node) ? node[0] !== null : node.trim() !== "");
const isSpec = (node: Node): node is ElementNode =>
  isElement(node) && node[0] === "pre" && node[1].language === "vega-lite";
const elements = (node: ElementNode, tag: string) =>
  childrenOf(node).filter((child): child is ElementNode => isElement(child) && child[0] === tag);
const text = (value: unknown) =>
  value === undefined || value === null || value instanceof Object
    ? ""
    : // SAFETY: undefined, null, objects, and arrays returned above, so only a string, number, or boolean is left.
      String(value as string | number | boolean).trim();
const code = (value: string) => `\`${value.replaceAll("`", "'")}\``;
const list = (values: string[], last = "and") =>
  values.length < 2
    ? values.join("")
    : `${values.slice(0, -1).join(", ")} ${last} ${values[values.length - 1]}`;

export const readNumber = (cell: string): number | undefined =>
  NUMBER.test(cell) ? Number(cell.replaceAll(",", "")) : undefined;

const format = (value: number) => value.toLocaleString("en-US", { maximumFractionDigits: 12 });

function kindOf(values: string[]): XKind {
  for (const [kind, pattern] of KINDS)
    if (values.every((value) => pattern.test(value))) return kind;
  return values.every((value) => readNumber(value) !== undefined) ? "number" : "name";
}

/**
 * Reads a `::chart` node, its props and the Markdown table inside it. Returns undefined when there's nothing to draw;
 * every problem goes to `issues` as one sentence that names the block and the fix.
 */
export function readChart(
  node: ElementNode,
  number: number,
  issues: Issue[],
): Chart | FlowChart | SpecChart | undefined {
  const name = `\`::chart\` ${number}`;
  const attrs = node[1];
  // A chart drawn from a spec checks its props itself.
  const spec = childrenOf(node).find(isSpec);
  for (const key of Object.keys(attrs))
    if (!spec && key !== "$" && !PROPS.has(key))
      issues.push({
        rule: "comark/charts/unknown-prop",
        message: `${name}: ${code(key)} isn't a prop of \`::chart\`. Valid props: type, x, y, title, labels, horizontal.`,
      });

  const content = childrenOf(node).filter(isContent);
  const table = content.find(
    (child): child is ElementNode => isElement(child) && child[0] === "table",
  );
  if (!table) {
    issues.push({
      rule: "comark/charts/missing-table",
      message: `${name} has no table to draw. Put a Markdown table between \`::chart\` and \`::\`: a header row, then one row per point.`,
    });
    return;
  }
  const annotations = content.filter(
    (child): child is ElementNode => isElement(child) && child[0] === "annotation",
  );
  if (spec)
    return readSpec(name, attrs, table, spec, content.length - 2, annotations.length, issues);
  if (content.length > 1 + annotations.length)
    issues.push({
      rule: "comark/charts/content-dropped",
      message: `${name} drops everything inside it but its table and annotations. Name the chart with \`title\`, and write other text outside the block.`,
    });

  const [head] = elements(table, "thead");
  const [body] = elements(table, "tbody");
  const headers = head ? elements(head, "tr").flatMap((row) => elements(row, "th")) : [];
  const columns = headers.map((cell) => textContent(cell).trim());
  const cells = (body ? elements(body, "tr") : []).map((row) =>
    elements(row, "td").map((cell) => textContent(cell).trim()),
  );
  if (columns.length < 2) {
    issues.push({
      rule: "comark/charts/too-few-columns",
      message: `${name}: its table needs at least two columns, the x values first and then the numbers.`,
    });
    return;
  }
  const unnamed = columns.findIndex((column) => !column);
  if (unnamed !== -1) {
    issues.push({
      rule: "comark/charts/unnamed-column",
      message: `${name}: column ${unnamed + 1} of its table has no header. Name it, since the name labels the chart.`,
    });
    return;
  }
  const repeated = columns.find((column, index) => columns.indexOf(column) !== index);
  if (repeated) {
    issues.push({
      rule: "comark/charts/duplicate-column",
      message: `${name}: its table has two columns named ${code(repeated)}. Give each column its own name.`,
    });
    return;
  }
  if (!cells.length) {
    issues.push({
      rule: "comark/charts/empty-table",
      message: `${name}: its table has a header but no rows. Add one row per point.`,
    });
    return;
  }
  const known = list(columns.map(code));

  const x = text(attrs.x) || columns[0]!;
  const xIndex = columns.indexOf(x);
  if (xIndex === -1) {
    issues.push({
      rule: "comark/charts/unknown-column",
      message: `${name}: \`x\` names column ${code(x)}, but its table has ${known}.`,
    });
    return;
  }
  const y = text(attrs.y);
  const named = y
    ? y
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean)
    : columns.filter((column) => column !== x);
  const missing = named.filter((column) => !columns.includes(column));
  if (missing.length) {
    issues.push({
      rule: "comark/charts/unknown-column",
      message: `${name}: \`y\` names ${missing.length > 1 ? "columns" : "column"} ${list(missing.map(code))}, but its table has ${known}. Separate several with commas, as in \`y="before, after"\`.`,
    });
    return;
  }
  if (named.includes(x)) {
    issues.push({
      rule: "comark/charts/x-in-y",
      message: `${name}: column ${code(x)} is both \`x\` and \`y\`. Remove it from \`y\`.`,
    });
    return;
  }
  if (text(attrs.type) === "sankey") {
    const flow = readFlow(
      name,
      attrs,
      columns,
      cells,
      x,
      y ? named : undefined,
      annotations,
      issues,
    );
    const flags = readFlags(name, "sankey", attrs, issues);
    return flow && { ...flow, ...flags };
  }
  if (text(attrs.type) === "gantt") {
    const gantt = readGantt(
      name,
      attrs,
      columns,
      cells,
      x,
      y ? named : undefined,
      annotations,
      issues,
    );
    const labels = readFlags(name, "gantt", attrs, issues);
    return gantt && { ...gantt, ...labels };
  }

  const rows = cells.map((row, index) => {
    const xValue = row[xIndex] ?? "";
    if (!xValue)
      issues.push({
        rule: "comark/charts/missing-x",
        message: `${name}: row ${index + 1} has no ${code(x)}. Fill it in, or remove the row.`,
      });
    const blank = named.map((column) => !row[columns.indexOf(column)]);
    const values = named.map((column) => {
      const cell = row[columns.indexOf(column)] ?? "";
      const value = readNumber(cell);
      if (cell && value === undefined)
        issues.push({
          rule: "comark/charts/non-numeric-value",
          message: `${name}: row ${index + 1} has ${code(cell)} in ${code(column)}, which isn't a number. Write the number alone, such as \`1200\` or \`1,200\`, and put the unit in the header, such as \`${column} (ms)\`.`,
        });
      return value;
    });
    return { x: xValue, values, blank };
  });
  const points = rows.filter((row) => row.x);
  // A scatter plot may repeat an x; elsewhere a repeat is a copy-paste slip that bars would quietly add up.
  const firstOf = new Map<string, number>();
  for (const [index, row] of rows.entries()) {
    if (!row.x) continue;
    const first = firstOf.get(row.x);
    if (first === undefined) firstOf.set(row.x, index);
    else if (text(attrs.type) !== "scatter") {
      issues.push({
        rule: "comark/charts/duplicate-x",
        message: `${name}: rows ${first + 1} and ${index + 1} both have ${code(row.x)} in ${code(x)}. Give each row its own ${code(x)}, or add the rows up into one.`,
      });
      break;
    }
  }
  const xKind = kindOf(points.map((row) => row.x));

  const typeText = text(attrs.type);
  let type =
    TYPES.find((type): type is Chart["type"] => type === typeText && type !== "sankey") ?? "bar";
  if (typeText && type !== typeText)
    issues.push({
      rule: "comark/charts/unknown-type",
      message: `${name}: \`type="${typeText}"\` isn't a chart type. Use ${list(
        TYPES.map((type) => `\`${type}\``),
        "or",
      )}.`,
    });
  if (type === "scatter" && xKind !== "number") {
    issues.push({
      rule: "comark/charts/non-numeric-x",
      message: `${name}: a scatter plot needs numbers in ${code(x)}, its \`x\`. Use \`type="bar"\`, or make \`x\` a column of numbers.`,
    });
    type = "bar";
  }
  if (type === "dumbbell" && named.length < 2) {
    issues.push({
      rule: "comark/charts/too-few-series",
      message: `${name}: a dumbbell joins two or more columns of numbers per row, such as \`before\` and \`after\`, and this one has ${code(named[0]!)}. Add a column, or use \`type="bar"\`.`,
    });
    type = "bar";
  }
  if ((type === "line" || type === "area") && points.length < 2) {
    issues.push({
      rule: "comark/charts/too-few-rows",
      message: `${name}: ${type === "area" ? "an area" : "a line"} needs at least two rows to draw, and this one has one. Add a row, or use \`type="bar"\`.`,
    });
    type = "bar";
  }
  let series = named;
  if ((type === "pie" || type === "waterfall") && named.length > 1) {
    issues.push({
      rule: "comark/charts/too-many-series",
      message: `${name}: a ${type} shows one column of numbers, and this one has ${list(named.map(code))}. Name one with \`y\`, or use \`type="bar"\`.`,
    });
    series = named.slice(0, 1);
  }
  if (type === "pie" && points.every((row) => !row.values[0])) {
    issues.push({
      rule: "comark/charts/invalid-pie-values",
      message: `${name}: a pie of ${code(series[0]!)} has nothing to divide, since every number is 0 or empty. Use \`type="bar"\`, or check the numbers.`,
    });
    type = "bar";
  }
  if (type === "pie" && points.some((row) => (row.values[0] ?? 0) < 0)) {
    issues.push({
      rule: "comark/charts/invalid-pie-values",
      message: `${name}: a pie can't show negative numbers. Use \`type="bar"\` for ${code(series[0]!)}.`,
    });
    type = "bar";
  }
  if (type === "waterfall") readTotal(name, points, issues);
  return {
    type,
    title: text(attrs.title),
    x,
    xKind,
    series,
    rows: points.map((row) => ({ x: row.x, values: row.values.slice(0, series.length) })),
    marks: readMarks(name, type, x, annotations, points, series, issues),
    ...readFlags(name, type, attrs, issues),
  };
}

/**
 * A waterfall's first row is its start total and its last row its end total, so the last must be the first plus every
 * change between them, as a reader checks it.
 */
function readTotal(
  name: string,
  points: { x: string; values: (number | undefined)[] }[],
  issues: Issue[],
) {
  const values = points.map((row) => row.values[0] ?? 0);
  if (values.length < 2) return;
  let sum = 0;
  let roundoff = 0;
  for (const value of values.slice(0, -1)) {
    const next = sum + value;
    // Safe integer additions are exact; otherwise allow only floating-point rounding at this step's scale.
    if (![sum, value, next].every(Number.isSafeInteger)) {
      roundoff += Number.EPSILON * (Math.abs(sum) + Math.abs(value));
    }
    sum = next;
  }
  const end = values.at(-1)!;
  if (Math.abs(end - sum) <= roundoff) return;
  const last = points.at(-1)!.x;
  const round = (value: number) =>
    value.toLocaleString("en-US", { maximumFractionDigits: 12, useGrouping: false });
  issues.push({
    rule: "comark/charts/waterfall-total",
    message: `${name}: a waterfall's last row is its end total, and ${code(last)} is ${round(end)} while ${code(points[0]!.x)} and the changes after it add up to ${round(sum)}. Fix the total, add the missing change, or end the table with a total row of ${round(sum)}.`,
  });
}

/** Reads a prop written alone, such as `{labels}`: true when it's on, and its problems when it has a value. */
function readFlag(name: string, prop: string, attrs: ElementNode[1], issues: Issue[]) {
  const raw = attrs[prop] ?? attrs[`:${prop}`];
  if (raw === undefined) return false;
  const value = text(raw);
  if (value === "false") return false;
  if (value === "" || value === "true") return true;
  issues.push({
    rule: `comark/charts/invalid-${prop}`,
    message: `${name}: \`${prop}\` takes no value. Write \`${prop}\` alone, as in \`::chart{type="bar" ${prop}}\`.`,
  });
  return false;
}

// The types with bars, steps, or dots to print a number on; lines, areas, scatter plots, and pies are read off their axis
// or legend and the data table.
const LABELED = new Set<ChartType>(["bar", "stacked", "waterfall", "dumbbell", "gantt", "sankey"]);

/** Reads `labels` and `horizontal`, each on the types that take it. */
function readFlags(name: string, type: ChartType, attrs: ElementNode[1], issues: Issue[]) {
  const flags: { labels?: true; horizontal?: true } = {};
  if (readFlag(name, "labels", attrs, issues)) {
    if (LABELED.has(type)) flags.labels = true;
    else
      issues.push({
        rule: "comark/charts/invalid-labels",
        message: `${name}: \`labels\` prints each number on its bar, step, dot, or node, and ${A[type]} has none. Remove it, or use \`type="bar"\`.`,
      });
  }
  if (readFlag(name, "horizontal", attrs, issues)) {
    if (type === "bar" || type === "stacked") flags.horizontal = true;
    else
      issues.push({
        rule: "comark/charts/invalid-horizontal",
        message:
          type === "dumbbell" || type === "gantt"
            ? `${name}: ${A[type]} always runs sideways, so \`horizontal\` changes nothing. Remove it.`
            : `${name}: \`horizontal\` turns bars sideways, and ${A[type]} has no bars to turn. Remove it, or use \`type="bar"\`.`,
      });
  }
  return flags;
}

/**
 * Reads the annotations after a chart's table into marks on the rows they name. A gantt passes its `groups`, since
 * it may repeat a task across them, and an annotation's `series` names the group rather than a column.
 */
function readMarks(
  name: string,
  type: ChartType,
  x: string,
  annotations: ElementNode[],
  points: { x: string; blank: boolean[]; group?: string }[],
  series: string[],
  issues: Issue[],
  groups?: { column?: string; names: string[] },
): ChartMark[] {
  const marks: ChartMark[] = [];
  let stamp = 1;
  for (const [index, child] of annotations.entries()) {
    const where = `${name}, annotation ${index + 1}`;
    const found: Issue[] = [];
    const markAttrs = child[1];
    for (const key of Object.keys(markAttrs))
      if (key !== "$" && !MARK_PROPS.has(key))
        found.push({
          rule: "comark/charts/unknown-prop",
          message: `${code(key)} isn't a prop of an annotation in a chart. Point at a row with \`at\`, and ${groups ? "its group" : "a column"} with \`series\`${groups ? "" : ', or cross the plot with `mark="line"` at a number with `value`'}.`,
        });
    const markProblems: Parameters<typeof readMark>[2] = [];
    const mark = readMark(child, markAttrs, markProblems);
    found.push(...markProblems);
    const at = text(markAttrs.at);
    const seriesName = text(markAttrs.series);
    const valueText = text(markAttrs.value);
    if (mark.mark === "line") {
      const value = readNumber(valueText);
      const axis = type !== "pie" && type !== "gantt" && type !== "sankey";
      if (!axis)
        found.push({
          rule: "comark/charts/invalid-line",
          message: `\`mark="line"\` crosses the plot at a number on its value axis, and ${A[type]} has none. Mark a ${type === "pie" ? "slice" : type === "sankey" ? "node" : "bar"} with \`at\` and another mark, such as \`box\`.`,
        });
      else if (!valueText)
        found.push({
          rule: "comark/charts/invalid-line",
          message: `\`mark="line"\` needs \`value\`, the number on the value axis it crosses at, such as \`value="200"\`.`,
        });
      else if (value === undefined)
        found.push({
          rule: "comark/charts/invalid-line",
          message: `\`value="${valueText}"\` isn't a number. Write the number alone, such as \`200\` or \`1,200\`, in the unit of the chart's numbers.`,
        });
      const extra = [at && "`at`", seriesName && "`series`"].filter(Boolean).join(" and ");
      if (axis && extra)
        found.push({
          rule: "comark/charts/invalid-line",
          message: `a line crosses the whole plot at its \`value\`, so ${extra} ${at && seriesName ? "don't" : "doesn't"} apply. Remove ${at && seriesName ? "them" : "it"}.`,
        });
      issues.push(
        ...found.map((problem) => ({ ...problem, message: `${where}: ${problem.message}` })),
      );
      if (axis && value !== undefined)
        marks.push({ ...mark, n: index + 1, number: mark.side ? undefined : stamp++, value });
      continue;
    }
    if (valueText)
      found.push({
        rule: "comark/charts/invalid-line",
        message: `\`value\` places a line across the plot. Add \`mark="line"\`, or remove \`value\` and mark a row with \`at\`.`,
      });
    const group = groups?.names.includes(seriesName) ? seriesName : undefined;
    const among = points.flatMap((point, row) =>
      group === undefined || point.group === group ? [{ ...point, row }] : [],
    );
    const matches = among.filter((point) => point.x === at);
    const row = matches[0]?.row ?? -1;
    const sample = among
      .slice(0, 3)
      .map((point) => code(point.x))
      .join(", ");
    // A sankey's marks name a node, which the table writes in either of two columns.
    const what = type === "sankey" ? `node in ${x}` : code(x);
    if (!at)
      found.push({
        rule: "comark/charts/invalid-at",
        message: `\`at\` is required: the ${type === "sankey" ? `node it marks, in ${x}` : `${code(x)} of the row it marks`}, one of ${sample}${among.length > 3 ? "…" : ""}.`,
      });
    else if (row === -1)
      found.push({
        rule: "comark/charts/invalid-at",
        message: `\`at="${at}"\` isn't a ${what} ${group === undefined ? "in the table" : `of the ${code(group)} rows`}. Copy it from the table, such as ${sample}.`,
      });
    else if (groups?.column && !seriesName && matches.length > 1)
      found.push({
        rule: "comark/charts/invalid-at",
        message: `\`at="${at}"\` names a row in ${list(matches.map((point) => code(point.group ?? "")))}. Add \`series\` with the ${code(groups.column)} of the one it marks.`,
      });
    if (seriesName && type === "sankey")
      found.push({
        rule: "comark/charts/unknown-series",
        message: `\`series\` doesn't apply to a sankey, where \`at\` names the node. Leave \`series\` out.`,
      });
    else if (seriesName && groups && group === undefined)
      found.push({
        rule: "comark/charts/unknown-series",
        message: groups.column
          ? `\`series="${seriesName}"\` isn't a ${code(groups.column)} in the table. Use ${list(groups.names.map(code), "or")}, or leave it out.`
          : `\`series\` names the group of the row a gantt annotation marks, and this table has no column of groups. Leave \`series\` out.`,
      });
    else if (seriesName && !groups && !series.includes(seriesName))
      found.push({
        rule: "comark/charts/unknown-series",
        message: `\`series="${seriesName}"\` isn't a column the chart draws. Use ${list(series.map(code), "or")}, or leave it out to mark the whole row.`,
      });
    const blank = points[row]?.blank;
    const column = groups ? -1 : series.indexOf(seriesName);
    if (blank && groups && blank.some(Boolean))
      found.push({
        rule: "comark/charts/marks-empty-cell",
        message: `\`at="${at}"\` marks a row with no start or no end, so the mark isn't drawn. Fill in both, or mark another row.`,
      });
    else if (blank && column !== -1 && blank[column])
      found.push({
        rule: "comark/charts/marks-empty-cell",
        message: `\`at="${at}"\` marks an empty ${code(seriesName)} cell, so the mark isn't drawn. Fill in the cell, or mark another row.`,
      });
    else if (blank && !groups && !seriesName && series.every((_, index) => blank[index]))
      found.push({
        rule: "comark/charts/marks-empty-cell",
        message: `\`at="${at}"\` marks a row with no numbers, so the mark isn't drawn. Fill in the row, or mark another one.`,
      });
    issues.push(
      ...found.map((problem) => ({ ...problem, message: `${where}: ${problem.message}` })),
    );
    if (row === -1) continue;
    marks.push({
      ...mark,
      n: index + 1,
      number: mark.side ? undefined : stamp++,
      row,
      series: !groups && series.includes(seriesName) ? seriesName : undefined,
    });
  }
  return marks;
}

const dated = (cell: string) => KINDS.some(([, pattern]) => pattern.test(cell));

/** Milliseconds since 1970 for a date as a table writes it, in UTC, so a chart reads the same wherever it's drawn. */
function readDate(cell: string) {
  if (!dated(cell)) return;
  // Date.parse moves a day the month doesn't have, such as `2026-02-31`, into the next month.
  const [year, month, day] = cell.slice(0, 10).split("-").map(Number);
  if (day !== undefined && new Date(Date.UTC(year!, month! - 1, day)).getUTCDate() !== day) return;
  // A time with no zone would read in the zone of the machine drawing the chart.
  const iso = cell.replace(" ", "T");
  const time = Date.parse(
    /T.*(?:Z|[+-]\d{2}:?\d{2})$/.test(iso) || !iso.includes("T") ? iso : `${iso}Z`,
  );
  return Number.isNaN(time) ? undefined : time;
}

/**
 * Reads a gantt's table: a bar per row from its start to its end, two columns of numbers or of dates, and a column of
 * names, when there is one, that groups the bars by color.
 */
function readGantt(
  name: string,
  attrs: ElementNode[1],
  columns: string[],
  cells: string[][],
  x: string,
  named: string[] | undefined,
  annotations: ElementNode[],
  issues: Issue[],
): Chart | undefined {
  const cellsOf = (column: string) => cells.flatMap((row) => row[columns.indexOf(column)] || []);
  // A column is of times when most of its cells are, so a typo in one is reported rather than taking the column.
  const times = (column: string) => {
    const filled = cellsOf(column);
    return (
      filled.filter((cell) => readNumber(cell) !== undefined || dated(cell)).length * 2 >=
      filled.length
    );
  };
  const others = columns.filter((column) => column !== x && !named?.includes(column));
  const span = named ?? others.filter(times);
  if (span.length !== 2) {
    issues.push({
      rule: "comark/charts/start-and-end",
      message: named
        ? `${name}: \`y\` names a gantt's start and end columns, and it names ${span.length === 1 ? "one" : span.length}, ${list(span.map(code))}. Name two, as in \`y="start, end"\`.`
        : `${name}: a gantt draws each row from its start to its end, two columns of numbers or dates, and its table has ${span.length ? `${span.length === 1 ? "one" : span.length}, ${list(span.map(code))}` : "none"}. ${span.length > 2 ? 'Name the two with `y`, as in `y="start, end"`. To color the bars by one of the others, such as a shard, write it as names, like `shard 1`.' : "Add a column for where each row starts and one for where it ends."}`,
    });
    return;
  }
  // SAFETY: span holds exactly two columns, since every other length returned above.
  const [startColumn, endColumn] = span as [string, string];
  // Numbers and dates left out of `y`, such as a duration, are left out of the chart too.
  const names = others.filter((column) => !span.includes(column) && !times(column));
  if (names.length > 1)
    issues.push({
      rule: "comark/charts/too-many-groups",
      message: `${name}: a gantt colors its bars by one column of names, and its table has ${list(names.map(code))}. Keep ${code(names[0]!)}, and move the others out of the table.`,
    });
  const group = names[0];

  // Dates and numbers don't share an axis, so the starts and ends take the kind most of them are.
  const filled = [...cellsOf(startColumn), ...cellsOf(endColumn)];
  const kind = kindOf(filled);
  const scale =
    kind !== "name"
      ? kind
      : filled.filter((cell) => readNumber(cell) !== undefined).length > filled.filter(dated).length
        ? "number"
        : "time";
  const read = (cell: string) => (scale === "number" ? readNumber(cell) : readDate(cell));
  const example =
    "Write every start and end as a number, such as `1.5` or `1,200`, or every one as a date, such as `2026-04-15` or `2026-04-15T09:30`.";

  const rows = cells.map((row, index) => {
    const xValue = row[columns.indexOf(x)] ?? "";
    if (!xValue)
      issues.push({
        rule: "comark/charts/missing-x",
        message: `${name}: row ${index + 1} has no ${code(x)}. Fill it in, or remove the row.`,
      });
    const blank = span.map((column) => !row[columns.indexOf(column)]);
    const values = span.map((column) => {
      const cell = row[columns.indexOf(column)] ?? "";
      const value = cell ? read(cell) : undefined;
      if (cell && value === undefined)
        issues.push({
          rule: "comark/charts/non-numeric-value",
          message: `${name}: row ${index + 1} has ${code(cell)} in ${code(column)}, which isn't ${scale === "number" ? "a number" : "a date"} like the other starts and ends. ${example}`,
        });
      return value;
    });
    const missing = span.filter((_, column) => blank[column]);
    if (xValue && missing.length)
      issues.push({
        rule: "comark/charts/start-and-end",
        message: `${name}: row ${index + 1} has no ${list(missing.map(code), "or")}, so its bar isn't drawn. Fill ${missing.length > 1 ? "them" : "it"} in; for a milestone, give it the same ${code(endColumn)} as its ${code(startColumn)}.`,
      });
    const [start, end] = values;
    const reversed = start !== undefined && end !== undefined && end < start;
    if (reversed)
      issues.push({
        rule: "comark/charts/end-before-start",
        message: `${name}: row ${index + 1} ends at ${code(row[columns.indexOf(endColumn)]!)}, before it starts at ${code(row[columns.indexOf(startColumn)]!)}. Swap them, or fix the ${code(endColumn)}.`,
      });
    return {
      x: xValue,
      // A bar that ends before it starts isn't drawn, as one with no end isn't.
      values: reversed ? [undefined, undefined] : values,
      blank,
      ...(group !== undefined && { group: row[columns.indexOf(group)] ?? "" }),
    };
  });
  const points = rows.filter((row) => row.x);
  // A task may repeat in another group, such as the same step in two runs, but not within its own.
  const firstOf = new Map<string, number>();
  for (const [index, row] of rows.entries()) {
    if (!row.x) continue;
    const key = JSON.stringify([row.x, row.group]);
    const first = firstOf.get(key);
    if (first === undefined) firstOf.set(key, index);
    else {
      issues.push({
        rule: "comark/charts/duplicate-x",
        message: `${name}: rows ${first + 1} and ${index + 1} both have ${code(row.x)} in ${code(x)}${group === undefined ? "" : ` and ${code(row.group ?? "")} in ${code(group)}`}. Give each row its own ${code(x)}${group === undefined ? "" : ` within a ${code(group)}`}.`,
      });
      break;
    }
  }
  const groups = [...new Set(points.map((row) => row.group ?? ""))];
  const marks = readMarks(name, "gantt", x, annotations, points, span, issues, {
    column: group,
    names: group === undefined ? [] : groups,
  });
  // With no bar to draw, the table shows as it is, as for any chart that can't be drawn.
  if (!points.some(({ values: [start, end] }) => start !== undefined && end !== undefined)) return;
  return {
    type: "gantt",
    title: text(attrs.title),
    x,
    xKind: "name",
    series: span,
    rows: points.map(({ x, values, group }) => ({
      x,
      values,
      ...(group !== undefined && { group }),
    })),
    marks,
    scale,
    ...(group !== undefined && { group }),
  };
}

/**
 * Reads a sankey's table: a row per flow, from the node in `x` to the node in the next column of names, as wide as the
 * column of numbers `y` names, or the first one.
 */
function readFlow(
  name: string,
  attrs: ElementNode[1],
  columns: string[],
  cells: string[][],
  x: string,
  named: string[] | undefined,
  annotations: ElementNode[],
  issues: Issue[],
): FlowChart | undefined {
  const cellsOf = (column: string) => cells.flatMap((row) => row[columns.indexOf(column)] || []);
  // A column is of numbers when most of its cells are, so a typo in one is reported rather than taking the column.
  const numeric = (column: string) => {
    const filled = cellsOf(column);
    return filled.filter((cell) => readNumber(cell) !== undefined).length * 2 >= filled.length;
  };
  const others = columns.filter((column) => column !== x);
  const to = others.find((column) => !named?.includes(column) && !numeric(column));
  const amounts = named ?? others.filter(numeric).slice(0, 1);
  if (!to || amounts.length !== 1) {
    issues.push({
      rule: "comark/charts/flow-columns",
      message:
        named && named.length !== 1
          ? `${name}: \`y\` names a sankey's one column of amounts, and it names ${named.length}, ${list(named.map(code))}. Name one, as in \`y="amount"\`.`
          : `${name}: a sankey reads three columns, where each flow comes from, where it goes, and how much, as in \`| from | to | amount |\`, and its table has ${list(columns.map(code))}. ${to ? "Add a column of amounts." : "Add a column naming where each flow goes."}`,
    });
    return;
  }
  // SAFETY: amounts holds exactly one column, since every other length returned above.
  const [amount] = amounts as [string];
  const nodes: string[] = [];
  const node = (label: string) => {
    if (!nodes.includes(label)) nodes.push(label);
    return nodes.indexOf(label);
  };
  const flows: FlowChart["flows"] = [];
  const firstOf = new Map<string, number>();
  for (const [index, row] of cells.entries()) {
    const [source = "", target = "", cell = ""] = [x, to, amount].map(
      (column) => row[columns.indexOf(column)] ?? "",
    );
    const missing = [!source && x, !target && to].filter((column): column is string => !!column);
    if (missing.length) {
      issues.push({
        rule: "comark/charts/missing-x",
        message: `${name}: row ${index + 1} has no ${list(missing.map(code), "or")}. Fill ${missing.length > 1 ? "them" : "it"} in, or remove the row.`,
      });
      continue;
    }
    const value = readNumber(cell);
    if (cell && value === undefined) {
      issues.push({
        rule: "comark/charts/non-numeric-value",
        message: `${name}: row ${index + 1} has ${code(cell)} in ${code(amount)}, which isn't a number. Write the number alone, such as \`1200\` or \`1,200\`, and put the unit in the header, such as \`${amount} ($)\`.`,
      });
      continue;
    }
    if (source === target) {
      issues.push({
        rule: "comark/charts/invalid-flow",
        message: `${name}: row ${index + 1} flows from ${code(source)} back into itself, which a sankey can't draw. Point it at another node, or remove the row.`,
      });
      continue;
    }
    if (value !== undefined && !Number.isFinite(value)) {
      issues.push({
        rule: "comark/charts/invalid-flow",
        message: `${name}: row ${index + 1} has ${code(cell)} in ${code(amount)}, which is too large to represent as a finite number. Use a smaller unit scale, or remove the row.`,
      });
      continue;
    }
    if (value === undefined || value <= 0) {
      issues.push({
        rule: "comark/charts/invalid-flow",
        message: `${name}: row ${index + 1} flows ${value === undefined ? "nothing" : code(cell)} from ${code(source)} to ${code(target)}, and a flow needs an amount above 0. ${value !== undefined && value < 0 ? `Swap ${code(x)} and ${code(to)} and write the amount without its sign, or remove the row.` : "Fill in the amount, or remove the row."}`,
      });
      continue;
    }
    const key = JSON.stringify([source, target]);
    const first = firstOf.get(key);
    if (first !== undefined) {
      issues.push({
        rule: "comark/charts/duplicate-x",
        message: `${name}: rows ${first + 1} and ${index + 1} both flow from ${code(source)} to ${code(target)}. Add them up into one row.`,
      });
      continue;
    }
    firstOf.set(key, index);
    flows.push({ from: node(source), to: node(target), value });
  }
  // A sankey runs one way, so a flow back to a node it came from has no column to land in.
  const next = (from: number) => flows.filter((flow) => flow.from === from).map((flow) => flow.to);
  const loop = (start: number, path: number[]): number[] | undefined => {
    for (const to of next(path.at(-1)!)) {
      if (to === start) return [...path, to];
      if (!path.includes(to)) {
        const found = loop(start, [...path, to]);
        if (found) return found;
      }
    }
  };
  for (const start of nodes.keys()) {
    const found = loop(start, [start]);
    if (!found) continue;
    issues.push({
      rule: "comark/charts/flow-cycle",
      message: `${name}: its flows run in a loop, ${found.map((index) => code(nodes[index]!)).join(" to ")}, and a sankey only runs one way. Remove one of those rows, or split a node in two, such as \`${nodes[start]} (in)\` and \`${nodes[start]} (out)\`.`,
    });
    // With nothing it can draw, the table shows as it is.
    return;
  }
  // A node in the middle passes on what it takes in, so sending out more means a flow into it is missing.
  for (const [index, label] of nodes.entries()) {
    const sum = (key: "from" | "to") =>
      flows.filter((flow) => flow[key] === index).reduce((total, flow) => total + flow.value, 0);
    const [out, into] = [sum("from"), sum("to")];
    if (into > 0 && out > into * (1 + 1e-9))
      issues.push({
        rule: "comark/charts/flow-imbalance",
        message: `${name}: ${code(label)} sends out ${format(out)} but takes in ${format(into)}. Add the flow into it that's missing, or check the amounts.`,
      });
  }
  if (!flows.length) return;
  return {
    type: "sankey",
    title: text(attrs.title),
    from: x,
    to,
    amount,
    nodes,
    flows,
    marks: readMarks(
      name,
      "sankey",
      `${code(x)} or ${code(to)}`,
      annotations,
      nodes.map((label) => ({ x: label, blank: [false] })),
      [amount],
      issues,
    ),
  };
}

/** Every value of `key` in an object, however deep: the fields a spec reads, or the ones its transforms make. */
function collect(value: unknown, key: string, found: string[] = []): string[] {
  if (Array.isArray(value)) for (const item of value) collect(item, key, found);
  else if (value instanceof Object)
    for (const [name, item] of Object.entries(value)) {
      if (name === key)
        for (const part of [item].flat()) {
          const field = text(part);
          if (field) found.push(field);
        }
      collect(item, key, found);
    }
  return found;
}

function readSpec(
  name: string,
  attrs: ElementNode[1],
  table: ElementNode,
  pre: ElementNode,
  others: number,
  annotations: number,
  issues: Issue[],
): SpecChart | undefined {
  for (const key of Object.keys(attrs))
    if (key !== "$" && key !== "title" && key !== "class" && key !== "id")
      issues.push({
        rule: "comark/charts/spec-with-props",
        message: `${name}: ${code(key)} doesn't apply to a chart drawn from a Vega-Lite spec. Name the columns in the spec's \`encoding\` instead.`,
      });
  if (annotations)
    issues.push({
      rule: "comark/charts/spec-with-annotations",
      message: `${name}: annotations mark charts comark-charts lays out, not one drawn from a Vega-Lite spec. Remove them, or draw the note with a \`text\` or \`rule\` layer in the spec.`,
    });
  if (others > annotations)
    issues.push({
      rule: "comark/charts/content-dropped",
      message: `${name} drops everything inside it but its table and its Vega-Lite spec. Name the chart with \`title\`, and write other text outside the block.`,
    });
  let spec: unknown;
  try {
    spec = JSON.parse(textContent(pre));
  } catch (error) {
    issues.push({
      rule: "comark/charts/invalid-spec-json",
      message: `${name}: its Vega-Lite spec isn't valid JSON (${error instanceof Error ? error.message : String(error)}). Fix it, or remove the \`vega-lite\` block to let comark-charts choose the chart.`,
    });
    return;
  }
  if (!(spec instanceof Object) || Array.isArray(spec)) {
    issues.push({
      rule: "comark/charts/invalid-spec-json",
      message: `${name}: its Vega-Lite spec must be one JSON object, such as \`{"mark": "bar", "encoding": {...}}\`.`,
    });
    return;
  }
  const head = elements(table, "thead")[0];
  const body = elements(table, "tbody")[0];
  const columns = (head ? elements(head, "tr").flatMap((row) => elements(row, "th")) : []).map(
    (cell) => textContent(cell).trim(),
  );
  const rows = (body ? elements(body, "tr") : []).map((row) =>
    elements(row, "td").map((cell) => textContent(cell).trim()),
  );
  const unnamed = columns.findIndex((column) => !column);
  const repeated = columns.find((column, index) => columns.indexOf(column) !== index);
  if (unnamed !== -1 || repeated || !rows.length) {
    issues.push(
      unnamed !== -1
        ? {
            rule: "comark/charts/unnamed-column",
            message: `${name}: column ${unnamed + 1} of its table has no header. Name it, since the spec reads columns by name.`,
          }
        : repeated
          ? {
              rule: "comark/charts/duplicate-column",
              message: `${name}: its table has two columns named ${code(repeated)}. Give each column its own name.`,
            }
          : {
              rule: "comark/charts/empty-table",
              message: `${name}: its table has no rows. Add one row per data point; the spec draws the table.`,
            },
    );
    return;
  }
  if ("data" in spec)
    issues.push({
      rule: "comark/charts/spec-with-data",
      message: `${name}: its Vega-Lite spec has \`data\`, but a chart's data is its table, so the table replaces it. Remove \`data\` from the spec.`,
    });
  // Fields made by transforms, such as a fold's `key` and `value`, are as real as the table's.
  const made = new Set([
    ...collect(spec, "as"),
    ...(collect(spec, "fold").length ? ["key", "value"] : []),
  ]);
  // A dot or a bracket reaches into nested data, which a table has none of, so only plain names are checked.
  const unknown = [...new Set(collect(spec, "field"))].filter(
    (field) => !columns.includes(field) && !made.has(field) && !/[.[\\]/.test(field),
  );
  if (unknown.length)
    issues.push({
      rule: "comark/charts/unknown-spec-field",
      message: `${name}: its Vega-Lite spec reads ${unknown.length > 1 ? "fields" : "field"} ${list(unknown.map(code))}, but its table has ${list(columns.map(code))}. Use the table's headers as field names.`,
    });
  // SAFETY: JSON.parse returned an object that isn't an array, so its keys are strings.
  const rest = { ...(spec as Record<string, unknown>) };
  delete rest.data;
  return {
    type: "vega-lite",
    title: text(attrs.title),
    columns,
    values: rows.map((row) =>
      Object.fromEntries(
        columns.map((column, index) => {
          const cell = row[index] ?? "";
          return [column, cell ? (readNumber(cell) ?? cell) : null];
        }),
      ),
    ),
    spec: rest,
  };
}
