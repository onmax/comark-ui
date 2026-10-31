import type { ElementNode, Node } from "comark";
import { defineComarkPlugin } from "comark";
import { resolveAttributes } from "comark/render";
import { text } from "../../../shared/text.ts";
import { childrenOf, isElement } from "../../../shared/nodes.ts";

export type MetricsMeta = {
  /** One readable sentence per problem with a `:delta`, `:progress`, or `::stats`. Other plugins add theirs too. */
  issues: string[];
  /** The comark-linter rule of each issue, by its sentence, so the linter reports it under its own code. */
  issueRules: Record<string, string>;
};

type Issue = { rule: `comark/metrics/${string}`; message: string };

/**
 * What a `:delta`, and each cell of a `::stats` table's change column, becomes. `from` and `to` are the values as shown,
 * with their unit; a table's cells leave them out, since the row shows them. `change` is the arrow and the percent.
 */
export type DeltaAttributes = {
  from?: string;
  to?: string;
  change?: string;
  direction?: "up" | "down" | "same";
  verdict?: "better" | "worse" | "neutral";
};

/** What a `:progress` becomes: the `<progress>` element's `value` and `max`, the percent it shows, and its label. */
export type ProgressAttributes = {
  value?: number;
  max?: number;
  percent?: string;
  label?: string;
};

/** The tag a `:progress` becomes, so a raw `<progress>` in the Markdown never reaches its components. */
export const PROGRESS_TAG = "progress-bar";

/** The tag a `::stats{tiles}` becomes: a grid of tiles, each a `div` of the metric's `dt`, its value, and its change. */
export const STATS_TILES_TAG = "stat-tiles";

type Data = Parameters<typeof resolveAttributes>[1];
type Better = "lower" | "higher" | undefined;

const NUMBER = /^([+-]?(?:\d[\d,]*(?:\.\d+)?|\.\d+))\s*(.*)$/;
const VALID_DIGITS = /^[+-]?(?:(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?|\.\d+)$/;

const elements = (node: ElementNode, tag: string) =>
  childrenOf(node).filter((child): child is ElementNode => isElement(child) && child[0] === tag);
const isContent = (node: Node) => (Array.isArray(node) ? node[0] !== null : node.trim() !== "");
const textOf = (node: Node): string =>
  !Array.isArray(node) ? node : isElement(node) ? childrenOf(node).map(textOf).join("") : "";
const decimals = (value: string) => value.split(".")[1]?.length ?? 0;

/** A number as written, such as `1,204` or `3.2 s`, with its unit. */
function quantity(value: string) {
  const [, digits = "", unit = ""] = NUMBER.exec(value.trim()) ?? [];
  const number = Number(digits.replaceAll(",", ""));
  return VALID_DIGITS.test(digits) && Number.isFinite(number)
    ? { number, digits, unit }
    : undefined;
}

const withUnit = (digits: string, unit: string) =>
  !unit ? digits : unit === "%" ? `${digits}%` : `${digits} ${unit}`;
const short = (number: number) => String(Number(number.toFixed(1)));

/** The arrow, the percent change (or the difference, from zero), and whether it's good news. */
function change(
  from: { number: number; digits: string },
  to: { number: number; digits: string },
  unit: string,
  better: Better,
): Required<Pick<DeltaAttributes, "change" | "direction" | "verdict">> {
  const difference = to.number - from.number;
  const direction = difference > 0 ? "up" : difference < 0 ? "down" : "same";
  const verdict =
    direction === "same" || !better
      ? "neutral"
      : (direction === "down") === (better === "lower")
        ? "better"
        : "worse";
  const arrow = direction === "up" ? "↑" : direction === "down" ? "↓" : "=";
  const places = Math.max(decimals(from.digits), decimals(to.digits));
  const amount =
    from.number === 0
      ? withUnit(Math.abs(difference).toFixed(places), unit)
      : `${short(Math.abs((difference / Math.abs(from.number)) * 100))}%`;
  return { change: direction === "same" ? "= 0%" : `${arrow} ${amount}`, direction, verdict };
}

const PROPS = {
  delta: { block: "`:delta`", props: ["from", "to", "unit", "better"] },
  progress: { block: "`:progress`", props: ["value", "max", "label"] },
  stats: { block: "`::stats`", props: ["unit", "better", "tiles"] },
};

function unknownProps(node: ElementNode, kind: keyof typeof PROPS, name: string, issues: Issue[]) {
  const { block, props } = PROPS[kind];
  for (const key of Object.keys(node[1])) {
    const prop = key.replace(/^:/, "");
    if (!props.includes(prop) && prop !== "id" && prop !== "class")
      issues.push({
        rule: "comark/metrics/unknown-prop",
        message: `${name}: \`${prop}\` isn't a prop of ${block}, so it's ignored. Use ${props
          .map((each) => `\`${each}\``)
          .join(", ")
          .replace(/, ([^,]+)$/, ", or $1")}.`,
      });
  }
}

function readBetter(value: unknown, name: string, issues: Issue[]): Better {
  const better = text(value);
  if (better === "lower" || better === "higher") return better;
  if (better)
    issues.push({
      rule: "comark/metrics/invalid-better",
      message: `${name}: \`better\` must be \`lower\` or \`higher\`, such as \`better="lower"\` for a size or a duration.`,
    });
  return undefined;
}

function delta(node: ElementNode, name: string, data: Data, issues: Issue[]): DeltaAttributes {
  unknownProps(node, "delta", name, issues);
  const attrs = resolveAttributes(node[1], data, { parseJson: true });
  const unit = text(attrs.unit);
  const better = readBetter(attrs.better, name, issues);
  const ends = (["from", "to"] as const).map((key) => {
    const raw = text(attrs[key]);
    const found = quantity(raw);
    if (!found)
      issues.push(
        raw
          ? {
              rule: "comark/metrics/invalid-number",
              message: `${name}: \`${key}="${raw}"\` isn't a number. Write the number alone and the unit in \`unit\`, such as \`${key}=412 unit="kB"\`.`,
            }
          : {
              rule: "comark/metrics/missing-number",
              message: `${name}: \`${key}\` is required. Write \`:delta{from=412 to=388}\`.`,
            },
      );
    return found;
  });
  const [from, to] = ends;
  if (!from || !to) return {};
  const shown = unit || from.unit || to.unit;
  return {
    from: withUnit(from.digits, from.unit || shown),
    to: withUnit(to.digits, to.unit || shown),
    ...change(from, to, shown, better),
  };
}

function progress(
  node: ElementNode,
  name: string,
  data: Data,
  issues: Issue[],
): ProgressAttributes {
  unknownProps(node, "progress", name, issues);
  const attrs = resolveAttributes(node[1], data, { parseJson: true });
  const label = text(attrs.label);
  const rawMax = text(attrs.max);
  const max = rawMax ? Number(rawMax) : 1;
  if (!(max > 0) || !Number.isFinite(max)) {
    issues.push({
      rule: "comark/metrics/invalid-max",
      message: `${name}: \`max\` must be a number above 0, such as \`max=100\`.`,
    });
    return {};
  }
  const raw = text(attrs.value);
  const value = quantity(raw);
  if (!value || value.unit) {
    issues.push(
      raw
        ? {
            rule: "comark/metrics/invalid-number",
            message: `${name}: \`value="${raw}"\` isn't a number. Write a fraction such as \`value=0.85\`, or a count with \`max\`, such as \`value=17 max=20\`.`,
          }
        : {
            rule: "comark/metrics/missing-number",
            message: `${name}: \`value\` is required. Write \`:progress{value=0.85}\`.`,
          },
    );
    return {};
  }
  let number = value.number;
  if (number < 0 || number > max) {
    issues.push({
      rule: "comark/metrics/value-out-of-range",
      message: `${name}: \`value=${value.digits}\` is outside 0 to ${max}, so the bar was clamped. ${
        number > max && max === 1
          ? `Write a fraction such as \`value=${number / 100}\`, or set \`max=100\`.`
          : `Fix \`value\` or \`max\`.`
      }`,
    });
    number = Math.min(Math.max(number, 0), max);
  }
  return {
    value: number,
    max,
    percent: `${short((number / max) * 100)}%`,
    ...(label && { label }),
  };
}

function stats(node: ElementNode, name: string, data: Data, issues: Issue[]): Node {
  unknownProps(node, "stats", name, issues);
  const attrs = resolveAttributes(node[1], data, { parseJson: true });
  const unit = text(attrs.unit);
  const better = readBetter(attrs.better, name, issues);
  const tiles = attrs.tiles !== undefined && attrs.tiles !== false && text(attrs.tiles) !== "false";
  const content = childrenOf(node).filter(isContent);
  const table = content.find(
    (child): child is ElementNode => isElement(child) && child[0] === "table",
  );
  if (!table) {
    issues.push({
      rule: "comark/metrics/missing-table",
      message: `${name} has no table. Put a Markdown table between \`::stats\` and \`::\`, with a name, a before, and an after column.`,
    });
    return ["div", {}];
  }
  const tableFallback = (): ElementNode => {
    table[1] = { ...table[1], class: "cmt-stats" };
    return table;
  };
  if (content.length > 1)
    issues.push({
      rule: "comark/metrics/content-dropped",
      message: `${name} drops everything inside it but its table. Write other text outside the block.`,
    });
  const [head] = elements(table, "thead");
  const [body] = elements(table, "tbody");
  const [header] = head ? elements(head, "tr") : [];
  const columns = header ? elements(header, "th").length : 0;
  if (columns !== 3 && !(tiles && columns === 2)) {
    issues.push({
      rule: "comark/metrics/column-count",
      message: `${name}: its table has ${columns} columns, but ${
        tiles
          ? "tiles need 2 or 3: a name, an optional before, and an after value"
          : "needs 3: a name, a before, and an after value"
      }. ${
        columns > 3
          ? "Move other columns to a table of their own."
          : columns === 2
            ? "Add a before column, or write `::stats{tiles}` to show each value as a tile."
            : "Add the missing columns."
      }`,
    });
    return tableFallback();
  }
  const needs = columns === 3 ? "3: a name, a before, and an after value" : "2: a name and a value";
  const grid: Node[] = [];
  let malformedRow = false;
  if (!tiles) header?.push(["th", {}, "Change"]);
  for (const row of body ? elements(body, "tr") : []) {
    const cells = elements(row, "td");
    // Markdown tables pad short rows with empty cells. In tile mode, an empty
    // trailing value is still a malformed two-column row, so keep the table
    // visible instead of drawing an incomplete tile.
    const trailingCell = cells.at(-1);
    const trailingValueMissing: boolean = Boolean(
      tiles && columns === 3 && trailingCell && !textOf(trailingCell).trim(),
    );
    const rowColumns: number = trailingValueMissing ? columns - 1 : cells.length;
    if (rowColumns !== columns) {
      malformedRow = true;
      issues.push({
        rule: "comark/metrics/column-count",
        message: `${name}: row has ${rowColumns} columns, but needs ${needs}. ${tiles ? "Fix the row, since the table is shown instead of tiles." : "Fix the row so no authored cells are lost."}`,
      });
      continue;
    }
    const [label, before, after] = cells.map((cell) => textOf(cell).trim());
    let cell: DeltaAttributes = {};
    if (columns === 3) {
      const where = `${name}, row "${label}"`;
      const [from, to] = [before, after].map(quantity);
      if (!from || !to)
        issues.push({
          rule: "comark/metrics/non-numeric-cell",
          message: `${where}: ${!from ? `"${before}"` : `"${after}"`} isn't a number, so it has no change. Write a number with an optional unit, such as \`412 kB\`.`,
        });
      else if ((from.unit || to.unit) && from.unit !== to.unit)
        issues.push({
          rule: "comark/metrics/unit-mismatch",
          message: `${where}: before is in ${from.unit || "no unit"} and after in ${to.unit || "no unit"}. Write both in the same unit.`,
        });
      else cell = change(from, to, from.unit || to.unit || unit, better);
    }
    if (!tiles) {
      row.push(["td", {}, ["delta", { ...cell }]]);
      continue;
    }
    const [term = [], value = []] = [cells[0], cells.at(-1)].map((each) =>
      each ? childrenOf(each) : [],
    );
    const tile: ElementNode = [
      "div",
      { class: "cmt-tile" },
      ["dt", {}, ...term],
      ["dd", { class: "cmt-value" }, ...value],
    ];
    if (cell.change) tile.push(["dd", {}, ["delta", { ...cell }]]);
    grid.push(tile);
  }
  if (tiles) {
    if (malformedRow) {
      return tableFallback();
    }
    return [STATS_TILES_TAG, {}, ...grid];
  }
  return tableFallback();
}

/**
 * Turns `:delta{from to}` into before → after with the percent change, colored by `better`, `:progress{value}` into a
 * `<progress>` with its percent, and `::stats` around a table of names, befores, and afters into the same table with a
 * change column, or with `tiles` into a grid of tiles. Problems are added to `meta.issues`.
 */
export default defineComarkPlugin<void, MetricsMeta>(() => ({
  name: "comark-metrics",
  post(state) {
    const { tree } = state;
    const data: Data = { frontmatter: tree.frontmatter, meta: tree.meta, data: {}, props: {} };
    const issues: Issue[] = [];
    const count = { delta: 0, progress: 0, stats: 0 };
    const walk = (nodes: Node[]) => {
      for (const [index, node] of nodes.entries()) {
        // A raw `<progress>` stays HTML.
        if (!isElement(node) || node[1].$?.html) continue;
        const [tag] = node;
        if (tag === "delta")
          node.splice(1, node.length - 1, delta(node, `\`:delta\` ${++count.delta}`, data, issues));
        else if (tag === "progress")
          node.splice(
            0,
            node.length,
            PROGRESS_TAG,
            progress(node, `\`:progress\` ${++count.progress}`, data, issues),
          );
        else if (tag === "stats")
          nodes[index] = stats(node, `\`::stats\` ${++count.stats}`, data, issues);
        else walk(childrenOf(node));
      }
    };
    walk(tree.nodes);
    tree.meta.issues = [...(tree.meta.issues ?? []), ...issues.map((issue) => issue.message)];
    tree.meta.issueRules = {
      ...tree.meta.issueRules,
      ...Object.fromEntries(issues.map((issue) => [issue.message, issue.rule])),
    };
  },
}));
