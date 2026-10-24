import type { ElementNode, Node } from "comark";
import { defineComarkPlugin } from "comark";
import type { Annotation } from "comark-annotate";
import { escapeHtml } from "comark/utils";
import type { draw } from "./draw.ts";
import type { Issue } from "./read.ts";
import { readChart } from "./read.ts";

export type { Chart, ChartType, SpecChart, XKind } from "./read.ts";

export type ChartsMeta = {
  /** One readable sentence per problem with a `::chart`. Other plugins add theirs too. */
  issues: string[];
  /** The comark-linter rule of each issue, by its sentence, so the linter reports it under its own code. */
  issueRules: Record<string, string>;
};

export interface ChartsOptions {
  /** Draw each chart while parsing. Off, the plugin only checks them, as comark-linter does. Defaults to true. */
  draw?: boolean;
}

/** What the plugin writes on a `::chart` it drew; the renderers read these and nothing else. */
export interface DrawnChart {
  type: string;
  title: string;
  /** The chart's accessible name: its title, or what it draws. */
  label: string;
  svg: string;
  /** Its comark-annotate marks, placed on the SVG. Only `@comark/html` draws them. */
  marks?: Annotation[];
}

const attr = (value: string) => escapeHtml(value, { '"': "&quot;" });
const isElement = (node: Node): node is ElementNode => Array.isArray(node) && node[0] !== null;
const childrenOf = ([, , ...rest]: ElementNode): Node[] => rest;

/** Calls `visit` on every `::chart` node in document order, with its number. */
export function eachChart(nodes: Node[], visit: (node: ElementNode, number: number) => void) {
  let count = 0;
  const walk = (children: Node[]) => {
    for (const node of children) {
      if (!isElement(node)) continue;
      if (node[0] === "chart") visit(node, ++count);
      else walk(childrenOf(node));
    }
  };
  walk(nodes);
}

/**
 * Checks and draws every `::chart`: its props, and the Markdown table it draws. Problems are added to `meta.issues`.
 * A drawn chart keeps only its table as content and carries its SVG in its attributes, so every renderer only places
 * it, and Vega never reaches the browser.
 */
export default defineComarkPlugin<ChartsOptions | void, ChartsMeta>((options) => ({
  name: "comark-charts",
  async post(state) {
    const { tree } = state;
    const issues: Issue[] = [];
    const found: { node: ElementNode; number: number }[] = [];
    eachChart(tree.nodes, (node, number) => found.push({ node, number }));
    for (const { node, number } of found) {
      const chart = readChart(node, number, issues);
      const table = childrenOf(node).find(
        (child): child is ElementNode => isElement(child) && child[0] === "table",
      );
      if (options?.draw === false) continue;
      if (!chart || !table) {
        // Nothing to draw: the renderers show the content as it is.
        node[1] = {};
        continue;
      }
      const spec = chart.type === "vega-lite";
      const label =
        chart.title ||
        (spec
          ? `chart of ${chart.columns.join(", ")}`
          : chart.type === "gantt"
            ? `gantt chart of ${chart.x}, from ${chart.series.join(" to ")}`
            : `${chart.type} chart of ${chart.series.join(", ")} by ${chart.x}`);
      let drawn: Awaited<ReturnType<typeof draw>>;
      try {
        // Flint and Vega take hundreds of milliseconds to load, so a document with no chart never loads them.
        const module = await import("./draw.ts");
        drawn = spec
          ? { ...(await module.drawSpec(chart)), boxes: new Map() }
          : await module.draw(chart);
      } catch (error) {
        const fix = spec
          ? "Check its Vega-Lite spec against https://vega.github.io/vega-lite/docs/"
          : "Check the table, or report it at https://github.com/onmax/comark-ui/issues";
        issues.push({
          rule: "comark/charts/draw-failed",
          message: `\`::chart\` ${number} couldn't be drawn (${error instanceof Error ? error.message : String(error)}), so it shows its table alone. ${fix}.`,
        });
        node.splice(1, node.length - 1, {}, table);
        continue;
      }
      // Marks the chart couldn't place, such as one on an empty cell, are left out rather than drawn in a corner.
      const marks = spec
        ? []
        : chart.marks.flatMap((mark) => {
            const box = drawn.boxes.get(mark.n);
            return box ? [{ ...mark, ...box }] : [];
          });
      const attrs: DrawnChart = {
        type: chart.type,
        title: chart.title,
        label,
        svg: drawn.svg.replace("<svg", `<svg role="img" aria-label="${attr(label)}"`),
        ...(marks.length && { marks }),
      };
      node.splice(1, node.length - 1, { ...attrs }, table);
    }
    tree.meta.issues = [...(tree.meta.issues ?? []), ...issues.map((issue) => issue.message)];
    tree.meta.issueRules = {
      ...tree.meta.issueRules,
      ...Object.fromEntries(issues.map((issue) => [issue.message, issue.rule])),
    };
  },
}));
