import { sankey, sankeyJustify, sankeyLinkHorizontal } from "d3-sankey";
import type * as vega from "vega";
import { INK, SERIES } from "./colors.ts";
import type { Box } from "./draw.ts";
import { boxes, format, PADDING, render } from "./draw.ts";
import type { FlowChart } from "./read.ts";

// The plot's width, so a sankey fills the card as the other charts do, a node's width, and a line of its label.
const WIDTH = 576;
const NODE = 12;
const LINE = 20;

/**
 * Draws a sankey: d3-sankey places the nodes in columns, in table order, with every sink in the last column, and Vega
 * draws them in the house type and colors, so it reads like the other charts and its marks are found the same way.
 */
export async function drawSankey(
  chart: FlowChart,
): Promise<{ svg: string; boxes: Map<number, Box> }> {
  // Nodes in a column sit at least a label apart, since a small flow's node is thinner than its name.
  const gap = (chart.labels ? 2 : 1) * LINE + 8;
  const layout = sankey<{ name: string; row: number }, { value: number }>()
    .nodeId((node) => node.row)
    .nodeAlign(sankeyJustify)
    .nodeSort(null)
    .nodeWidth(NODE)
    .nodePadding(gap);
  const graph = () => ({
    nodes: chart.nodes.map((name, row) => ({ name, row })),
    links: chart.flows.map((flow) => ({ source: flow.from, target: flow.to, value: flow.value })),
  });
  // The fullest column sets the height, so its nodes keep room for their flows past the gaps between them.
  const columns = new Map<number, number>();
  for (const node of layout(graph()).nodes)
    columns.set(node.depth!, (columns.get(node.depth!) ?? 0) + 1);
  const height = Math.max(240, Math.max(...columns.values()) * (gap + 16));
  // Nodes keep half a label from the plot's top and bottom, so a label beside an edge stays inside it.
  const block = (chart.labels ? 2 : 1) * LINE;
  const { nodes, links } = layout.extent([
    [0, block / 2],
    [WIDTH, height - block / 2],
  ])(graph());
  const color = (row: number) => SERIES[row % SERIES.length]!;
  const last = Math.max(...nodes.map((node) => node.x1!));
  // A flow into a node that ends there takes that node's color, and any other flow its source's, so a flow reads as the
  // outcome it leads to, or the origin it comes from.
  // d3-sankey swaps each flow's ends, given as ids, for the nodes it laid out.
  const rowOf = (end: (typeof links)[number]["source"]) =>
    nodes.find((node) => node === end)?.row ?? -1;
  const sink = (row: number) => !links.some((link) => rowOf(link.source) === row);
  const path = sankeyLinkHorizontal();
  // A label sits beside its node, toward the middle, so the last column's labels end where their nodes start. The
  // labels on either side of the last gap face each other and share it; a longer name is cut short, and the table
  // under the chart keeps it whole.
  const lefts = [...new Set(nodes.map((node) => node.x0!))].sort((a, b) => a - b);
  const room = (left: number, end: boolean) => {
    const column = lefts.indexOf(left);
    const [from, to] = end ? [lefts[column - 1]!, left] : [left, lefts[column + 1]!];
    const gap = to - from - NODE;
    return (end || column + 2 === lefts.length ? gap / 2 : gap) - 9;
  };
  const nodeValues = nodes.map((node) => {
    const end = node.x1! >= last;
    return {
      row: node.row,
      name: node.name,
      value: format(node.value!),
      x: node.x0!,
      x2: node.x1!,
      y: node.y0!,
      // A node always shows, however small its flow.
      y2: Math.max(node.y1!, node.y0! + 1),
      fill: color(node.row),
      tx: end ? node.x0! - 6 : node.x1! + 6,
      ty: (node.y0! + node.y1!) / 2,
      align: end ? "right" : "left",
      limit: lefts.length > 1 ? room(node.x0!, end) : WIDTH,
    };
  });
  const linkValues = links.map((link) => {
    const [source, target] = [rowOf(link.source), rowOf(link.target)];
    return {
      d: path(link) ?? "",
      width: Math.max(1, link.width!),
      stroke: color(sink(target) ? target : source),
    };
  });
  const text = (
    field: "name" | "value",
    dy: number,
    fill: string,
    weight: 400 | 500,
  ): vega.Mark => ({
    type: "text",
    from: { data: "nodes" },
    aria: false,
    encode: {
      enter: {
        x: { field: "tx" },
        y: { field: "ty" },
        dy: { value: dy },
        text: { field },
        align: { field: "align" },
        baseline: { value: "middle" },
        limit: { field: "limit" },
        fill: { value: fill },
        font: { value: "sans-serif" },
        fontSize: { value: 12 },
        fontWeight: { value: weight },
      },
    },
  });
  const spec: vega.Spec = {
    width: WIDTH,
    height,
    padding: chart.marks.some((mark) => mark.mark === "circle")
      ? { ...PADDING, bottom: PADDING.bottom + 20 }
      : PADDING,
    // Every node, flow, and label sits inside the plot, and Vega would pad for a thick flow's stroke all the same.
    autosize: "none",
    background: "transparent",
    data: [
      { name: "nodes", values: nodeValues },
      { name: "links", values: linkValues },
    ],
    marks: [
      {
        type: "path",
        from: { data: "links" },
        aria: false,
        encode: {
          enter: {
            path: { field: "d" },
            stroke: { field: "stroke" },
            strokeWidth: { field: "width" },
            strokeOpacity: { value: 0.3 },
            fill: { value: "none" },
          },
        },
      },
      {
        type: "rect",
        from: { data: "nodes" },
        aria: false,
        encode: {
          enter: {
            x: { field: "x" },
            x2: { field: "x2" },
            y: { field: "y" },
            y2: { field: "y2" },
            fill: { field: "fill" },
            cornerRadius: { value: 2 },
          },
        },
      },
      text("name", chart.labels ? -LINE / 2 : 0, INK.foreground, 500),
      ...(chart.labels ? [text("value", LINE / 2, INK.muted, 400)] : []),
    ],
  };
  const { view, svg } = await render(spec);
  const [, width = "0", tall = "0"] = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(svg) ?? [];
  const found = boxes(chart, view, Number(width), Number(tall));
  view.finalize();
  return { svg, boxes: found };
}
