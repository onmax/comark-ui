import type { ChartAssemblyInput, ThemeSpec } from "flint-chart";
import { assembleVegaLite } from "flint-chart";
import * as vega from "vega";
import { expressionInterpreter } from "vega-interpreter";
import type { TopLevelSpec } from "vega-lite";
import type { Field } from "vega-lite/types_unstable/channeldef.js";
import type { LayerSpec, UnitSpec } from "vega-lite/types_unstable/spec/index.js";
import { compile } from "vega-lite";
import { INK, SERIES } from "./colors.ts";
import type { Chart, SpecChart, XKind } from "./read.ts";

const { logger, None, parse, View } = vega;

// Shares of an em in a sans-serif, a little wide so that text guessed to fit does.
const EM = [
  [/\p{Extended_Pictographic}/u, 1.3],
  [
    /[\u1100-\u115f\u2e80-\ua4cf\uac00-\ud7a3\uf900-\ufaff\ufe30-\ufe4f\uff00-\uff60\uffe0-\uffe6]/u,
    1.05,
  ],
  [/[ijlI|!.,:;'`()[\]{}]/u, 0.32],
  [/[frt ]/u, 0.4],
  [/[mwMW@%]/u, 0.9],
  [/[A-Z]/u, 0.7],
  [/\d/u, 0.6],
] as const;
// Graphemes, so a family or a flag emoji counts as the one glyph it draws.
const graphemes = new Intl.Segmenter();
const guess = (text: string, size: number) => {
  let width = 0;
  for (const { segment } of graphemes.segment(text))
    width += EM.find(([kind]) => kind.test(segment))?.[1] ?? 0.58;
  return width * size;
};

// Without a canvas Vega guesses every character at 0.8em, wider than most letters, so greedy overlap hides labels that
// fit and limits cut others short. Vega takes a better guess through `textMetrics.width`, the hook vl-convert uses,
// though vega-typings leaves it out. Clamped at the item's limit, it serves both Vega's truncation and its bounds.
interface TextItem {
  fontSize?: number;
  limit?: number;
}
const metrics: unknown = Reflect.get(vega, "textMetrics");
if (
  metrics &&
  Reflect.get(Object(metrics), "width") === Reflect.get(Object(metrics), "estimateWidth")
)
  Reflect.set(Object(metrics), "width", (item: TextItem, text: string | number | undefined) =>
    Math.min(item.limit || Infinity, guess(String(text ?? "").trim(), item.fontSize ?? 11)),
  );

const theme: ThemeSpec = {
  extends: "nyt",
  ink: {
    surface: { source: "host" },
    text: {
      primary: INK.foreground,
      secondary: INK.muted,
      muted: INK.muted,
      inverse: INK.background,
    },
    structure: { grid: INK.border, axis: INK.muted, rule: INK.muted, zero: INK.muted },
    series: {
      single: SERIES[0],
      categorical: [...SERIES],
      categoricalExtended: [...SERIES],
      overflow: INK.muted,
      // A waterfall's steps: up, down, and the totals at its ends.
      status: { positive: SERIES[2], negative: SERIES[4], neutral: INK.muted },
    },
    accent: SERIES[1],
  },
  // shadcn/ui's charts: no axis lines or ticks, faint horizontal grid lines, rounded bars, smooth lines without dots, and
  // 12px labels.
  structure: {
    axis: {
      categorical: { line: "omit", ticks: "omit" },
      measure: { line: "omit", ticks: "omit" },
    },
    grid: { measure: "quiet", category: "omit", style: "solid", zero: "omit" },
    frame: "omit",
    baseline: "omit",
  },
  marks: {
    cornerRadius: 4,
    strokeWeight: 2,
    interpolation: "monotone",
    fillOpacity: 0.4,
    point: { presence: "omit" },
  },
  // A value that doesn't fit beside its mark is left to the axis and the data table.
  dataLabels: { show: "whenTheyFit", placement: "outsideMark", inkMode: "fixed" },
  labels: { angle: "horizontal" },
  type: {
    headline: { family: "sans-serif", color: INK.foreground },
    deck: { family: "sans-serif", color: INK.muted },
    axisLabel: { family: "sans-serif", size: 12 },
    keyLabel: { family: "sans-serif", size: 12 },
    valueLabel: { family: "sans-serif", size: 12, weight: "medium" },
  },
  chartDefaults: { "Line Chart": { showPoints: false } },
};

const SEMANTIC: Record<XKind, string> = {
  year: "Year",
  month: "YearMonth",
  date: "Date",
  time: "DateTime",
  number: "Quantity",
  name: "Category",
};

const quiet = logger(None);

// Bars turn sideways when their labels would crowd under them, so long names, such as file paths, stay readable.
const sideways = (chart: Chart) =>
  chart.rows.length * Math.max(1, chart.series.length) > 12 ||
  chart.rows.some((row) => row.x.length > 12);

const longest = (chart: Chart) => Math.max(...chart.rows.map((row) => row.x.length));

/** A label broken between words into lines no wider than `room`, as far as a long word allows. */
function wrap(text: string, room: number) {
  const lines: string[] = [];
  for (const word of text.split(" ")) {
    const last = lines.at(-1);
    if (last !== undefined && guess(`${last} ${word}`, 12) <= room)
      lines[lines.length - 1] += ` ${word}`;
    else lines.push(word);
  }
  return lines;
}

// A top legend is one row unless told otherwise, so it wraps into as many columns as fit the card.
function legendColumns(chart: Chart, room = 520) {
  const names =
    chart.type === "pie"
      ? chart.rows.map((row) => row.x)
      : chart.type === "waterfall"
        ? ["total", "increase", "decrease"]
        : chart.type === "gantt"
          ? [...new Set(chart.rows.map((row) => row.group ?? ""))]
          : chart.series;
  const widest = Math.max(...names.map((name) => name.length)) * 7 + 40;
  return Math.max(1, Math.min(names.length, Math.floor(room / widest)));
}

// Lines are named at their ends, which only reads when the ends sit apart; otherwise a legend names them.
function endsCrowd(chart: Chart) {
  if (chart.series.length > 6) return true;
  // An area names each part inside its last slice, which needs a slice thick enough to hold the name.
  if (chart.type === "area") {
    const total = (row: Chart["rows"][number]) =>
      row.values.reduce<number>((sum, value) => sum + (value ?? 0), 0);
    const tallest = Math.max(...chart.rows.map(total));
    const last = chart.rows.at(-1)?.values ?? [];
    return (
      chart.series.length > 4 || tallest <= 0 || last.some((value) => (value ?? 0) / tallest < 0.1)
    );
  }
  // A series that stops early is named where it stops, among the other lines rather than at the end.
  if (chart.rows.at(-1)?.values.some((value) => value === undefined)) return true;
  const values = chart.rows.flatMap((row) => row.values.filter((value) => value !== undefined));
  const span = Math.max(0, ...values) - Math.min(0, ...values) || 1;
  const ends = chart.series
    .map((_, index) => chart.rows.findLast((row) => row.values[index] !== undefined)?.values[index])
    .filter((value) => value !== undefined)
    .sort((a, b) => a - b);
  return ends.some((value, index) => index > 0 && (value - ends[index - 1]!) / span < 0.1);
}

/** The decisions a chart's shape forces before Flint lays it out. */
function layout(chart: Chart) {
  const { type } = chart;
  // A gantt's bars run sideways from the task names, and its numbers are the durations printed past each bar.
  if (type === "gantt")
    return {
      flip: true,
      bars: chart.rows.length,
      crowded: true,
      legend: chart.group !== undefined,
      width: Math.round(Math.max(200, Math.min(520, 600 - (7 * longest(chart) + 40)))),
    };
  const many = chart.series.length > 1;
  const flip = type === "dumbbell" || ((type === "bar" || type === "stacked") && sideways(chart));
  const bars = chart.rows.length * (type === "bar" ? chart.series.length : 1);
  // A value printed past a negative bar's end lands among the axis labels when the bar reaches the edge.
  const negative = chart.rows.some((row) => row.values.some((value) => (value ?? 0) < 0));
  // Bars thinner than a line of text can't hold their values, so the value axis reads them instead. Stacked parts are
  // often thinner still, so they never print theirs, as in shadcn/ui.
  const crowded = (type === "bar" && bars > 12) || type === "stacked" || negative;
  // A dumbbell names its series over the first row, where equal values pile the names up, and lines and areas name
  // theirs at their ends, which only reads when the ends sit apart.
  const legend =
    type === "dumbbell" || ((type === "line" || type === "area") && many && endsCrowd(chart));
  // The card leaves about 670px. Labels sit beside the plot, so the plot gets what the widest of them leaves: names on
  // a sideways chart, values on an upright one, and series names at the ends of lines.
  const numbers = chart.rows.flatMap((row) => row.values.filter((value) => value !== undefined));
  const valueLabel =
    Math.max(...numbers.map((value) => Math.round(value).toLocaleString("en-US").length)) * 7;
  const endLabels =
    type === "line" && !legend ? Math.max(...chart.series.map((name) => name.length)) * 7 + 12 : 0;
  const labels = flip ? 7 * longest(chart) + 40 : valueLabel + 40 + endLabels;
  const width = Math.round(Math.max(200, Math.min(520, 600 - labels)));
  return { flip, bars, crowded, legend, width };
}

// Field names are fixed, since Vega-Lite reads dots and brackets in a column's name as a path into the row.
function input(chart: Chart): ChartAssemblyInput {
  const { type } = chart;
  if (type === "gantt") return ganttInput(chart);
  const many = chart.series.length > 1;
  const { flip, bars, crowded, legend, width } = layout(chart);
  // A bar, a step, or a dot row per value, so a numeric x on those is a name.
  const banded =
    type === "bar" || type === "stacked" || type === "waterfall" || type === "dumbbell";
  // Flint joins a dumbbell's dots per row only over names; over dates its connector runs through every row.
  const kind = type === "dumbbell" || (banded && chart.xKind === "number") ? "name" : chart.xKind;
  const xValue = (value: string) => (kind === "number" ? Number(value.replaceAll(",", "")) : value);
  // `row` lets a mark find the shapes drawn for its row once the chart is laid out.
  const values = chart.rows.flatMap((row, number) =>
    chart.series.flatMap((series, index) => {
      const y = row.values[index];
      return y === undefined ? [] : [{ x: xValue(row.x), y, series, row: number }];
    }),
  );
  const encodings: Record<string, { field: string }> =
    type === "pie"
      ? { size: { field: "y" }, color: { field: "x" } }
      : flip
        ? { x: { field: "y" }, y: { field: "x" } }
        : { x: { field: "x" }, y: { field: "y" } };
  if (many) encodings[type === "bar" ? "group" : "color"] = { field: "series" };
  const chartType = {
    bar: many ? "Grouped Bar Chart" : "Bar Chart",
    stacked: many ? "Stacked Bar Chart" : "Bar Chart",
    line: "Line Chart",
    area: "Area Chart",
    scatter: "Scatter Plot",
    dumbbell: "Ranged Dot Plot",
    waterfall: "Waterfall Chart",
    pie: "Pie Chart",
  }[type];
  return {
    data: { values },
    semantic_types: { x: SEMANTIC[kind], y: "Quantity", series: "Category" },
    field_display_names: { x: chart.x, y: many ? "" : chart.series[0]!, series: "" },
    chart_spec: {
      chartType,
      encodings,
      baseSize: { width, height: 320 },
      // Flint grows a crowded chart, but only downward: the width is already what the labels leave. Past the canvas
      // Flint drops rows and says "items omitted", so a sideways chart grows as tall as its bars need.
      canvasSize: { width, height: flip ? Math.max(640, bars * 20 + 200) : 640 },
      // Flint packs a band's bars together when some rows lack a series, but it finds the band from the column's
      // type, so over dates it sorts bars into lanes by their value, and some draw zero wide. Every band gets a lane per
      // series instead, as in most grouped bar charts.
      // A waterfall prints its numbers itself, apart from the theme's value labels, and only when asked.
      chartProperties: { dodge: "global", ...(type === "waterfall" && { showTextLabels: true }) },
    },
    options: { maxColorValues: SERIES.length },
    theme_spec: {
      ...theme,
      ...((crowded || (legend && type === "area")) && {
        dataLabels: { ...theme.dataLabels, show: "never" },
      }),
      // With `labels` every bar prints its value, so Flint hides the value axis and leaves room past the bars. The
      // labels are the plugin's own, placed once the bars are drawn.
      ...(chart.labels && { dataLabels: { ...theme.dataLabels, show: "always" } }),
      // The New York Times theme dots a line's ends, and on a dumbbell, which is all ends, that layer repaints some dots
      // in the first series' color.
      ...(type === "dumbbell" && { annotation: { ...theme.annotation, pointEmphasis: "never" } }),
      legend: {
        ...theme.legend,
        maxSwatches: SERIES.length,
        ...(legend && { placement: ["top"] }),
      },
    },
  };
}

// A gantt's rows sit this far apart, close enough to read as one timeline.
const GANTT_STEP = 28;

/**
 * How long a gantt's bar lasts, as it prints past the bar: the difference of two numbers, or of two dates in the
 * unit the table writes them in, such as `3y`, `2mo`, or `7d`, and for times the largest unit it fills, such as `1.5h`.
 */
function duration(chart: Chart, start: number, end: number) {
  const round = (value: number) => Math.round(value * 10) / 10;
  const [from, to] = [new Date(start), new Date(end)];
  const months =
    (to.getUTCFullYear() - from.getUTCFullYear()) * 12 + to.getUTCMonth() - from.getUTCMonth();
  switch (chart.scale) {
    case "number":
    case undefined:
      return format(Math.round((end - start) * 100) / 100);
    case "year":
      return `${round(months / 12)}y`;
    case "month":
      return `${months}mo`;
    default: {
      const span = end - start;
      if (span >= DAY) return `${round(span / DAY)}d`;
      if (span >= 60 * MINUTE) return `${round(span / (60 * MINUTE))}h`;
      if (span >= MINUTE) return `${round(span / MINUTE)}min`;
      return `${round(span / 1000)}s`;
    }
  }
}

function ganttInput(chart: Chart): ChartAssemblyInput {
  const { width } = layout(chart);
  const time = chart.scale === "number" ? "Quantity" : "DateTime";
  const grouped = chart.group !== undefined;
  // A task may repeat in another group, so each row is its own line on the y axis, keyed by its number, and the axis
  // prints its task.
  const values = chart.rows.flatMap((row, number) => {
    const [start, end] = row.values;
    return start === undefined || end === undefined
      ? []
      : [
          {
            x: String(number),
            start,
            end,
            duration: duration(chart, start, end),
            series: row.group ?? "",
            row: number,
          },
        ];
  });
  return {
    data: { values },
    semantic_types: { x: "Category", start: time, end: time, series: "Category" },
    field_display_names: {
      x: chart.x,
      start: chart.series[0]!,
      end: chart.series[1]!,
      series: chart.group ?? "",
    },
    chart_spec: {
      chartType: "Gantt Chart",
      encodings: {
        y: { field: "x" },
        x: { field: "start" },
        x2: { field: "end" },
        ...(grouped && { color: { field: "series" } }),
      },
      baseSize: { width, height: chart.rows.length * GANTT_STEP },
      canvasSize: { width, height: Math.max(640, chart.rows.length * GANTT_STEP + 200) },
      chartProperties: { intervalLabels: true },
    },
    options: { maxColorValues: SERIES.length },
    theme_spec: {
      ...theme,
      legend: {
        ...theme.legend,
        maxSwatches: SERIES.length,
        ...(grouped && { placement: ["top"] }),
      },
    },
  };
}

type Unit = TopLevelSpec | LayerSpec<Field> | UnitSpec<Field>;
/** A spec and every layer inside it, however deep: Flint nests layers in some templates. */
function units(spec: Unit): Unit[] {
  return "layer" in spec ? [spec, ...spec.layer.flatMap((layer) => units(layer))] : [spec];
}

/** Where a mark sits, as percentages of the SVG, like a comark-annotate box on a screenshot. */
export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

// Shapes drawn one per value; lines, areas, and labels span several or don't mark a value.
const SHAPES = new Set(["rect", "symbol", "arc"]);
// A mark keeps clear of the shape it circles, and a point gets a box big enough to draw around. A mark that draws
// nothing only leaves its arrow a hair short of the point, so the arrow reaches the data.
const PAD = 6;
const PADDING = { left: 12, right: 12, top: 12, bottom: 12 };
const SMALLEST = 18;
const BARE = 3;

interface SceneItem {
  x?: number;
  y?: number;
  bounds?: { x1: number; y1: number; x2: number; y2: number };
  datum?: { row?: unknown; series?: unknown; y?: unknown };
  mark?: { marktype?: string };
  items?: SceneItem[];
}

/** Calls `visit` on every item of a drawn chart with its offset from the root group, the frame its layers draw in. */
function walk(view: vega.View, visit: (item: SceneItem, dx: number, dy: number) => void) {
  // Vega types its scenegraph as a bare Scene, but at runtime it holds the root group, whose items carry the fields
  // SceneItem names.
  const scene: SceneItem = Reflect.get(view.scenegraph(), "root");
  const root = scene.items?.[0];
  const step = (item: SceneItem, dx: number, dy: number) => {
    visit(item, dx, dy);
    const group = item.mark?.marktype === "group";
    for (const child of item.items ?? [])
      step(child, dx + (group ? (item.x ?? 0) : 0), dy + (group ? (item.y ?? 0) : 0));
  };
  step(scene, -(root?.x ?? 0), -(root?.y ?? 0));
}

// The axis a chart's numbers run along: across when its bars or rows run sideways. Pies and gantts take no line.
const valueAxis = (chart: Chart) => (layout(chart).flip ? "x" : "y");
// A line's box reaches this far to each side of it, so its stamp and its arrow sit on the line.
const LINE = 4;

function boxes(chart: Chart, view: vega.View, width: number, height: number): Map<number, Box> {
  const found = new Map<number, Box>();
  // Vega draws the scene at its origin plus its padding, and origin() leaves the padding out.
  const [x0, y0] = view.origin();
  const [left, top] = [x0 + PADDING.left, y0 + PADDING.top];
  for (const mark of chart.marks) {
    let [x1, y1, x2, y2] = [Infinity, Infinity, -Infinity, -Infinity];
    if (mark.value !== undefined) {
      // A line runs across the whole plot at its value.
      const at = Number(view.scale(valueAxis(chart))?.(mark.value));
      if (!Number.isFinite(at)) continue;
      [x1, y1, x2, y2] =
        valueAxis(chart) === "y"
          ? [left, top + at, left + view.width(), top + at]
          : [left + at, top, left + at, top + view.height()];
    } else
      walk(view, (item, dx, dy) => {
        const { datum, bounds } = item;
        if (!bounds || !datum || !SHAPES.has(item.mark?.marktype ?? "")) return;
        if (datum.row !== mark.row || (mark.series && datum.series !== mark.series)) return;
        x1 = Math.min(x1, bounds.x1 + dx + left);
        y1 = Math.min(y1, bounds.y1 + dy + top);
        x2 = Math.max(x2, bounds.x2 + dx + left);
        y2 = Math.max(y2, bounds.y2 + dy + top);
      });
    if (x1 === Infinity) continue;
    const grow = (from: number, to: number) =>
      mark.value !== undefined
        ? to === from
          ? LINE
          : 0
        : mark.mark === "none"
          ? BARE
          : Math.max(0, (SMALLEST - (to - from)) / 2) + PAD;
    const [gx, gy] = [grow(x1, x2), grow(y1, y2)];
    const box = {
      x: Math.max(0, x1 - gx),
      y: Math.max(0, y1 - gy),
      w: Math.min(width, x2 + gx) - Math.max(0, x1 - gx),
      h: Math.min(height, y2 + gy) - Math.max(0, y1 - gy),
    };
    const round = (value: number) => Math.round(value * 100) / 100;
    found.set(mark.n, {
      x: round((box.x / width) * 100),
      y: round((box.y / height) * 100),
      w: round((box.w / width) * 100),
      h: round((box.h / height) * 100),
    });
  }
  return found;
}

const format = (value: number) => value.toLocaleString("en-US", { maximumFractionDigits: 12 });

interface Label {
  x: number;
  y: number;
  text: string;
  fill: string;
}

/**
 * Where each bar's value goes, in the root group's frame: inside its bar or segment where it fits, else just past the
 * bar's end. A segment in the middle of a stack has no end to sit past, so one too thin for its value leaves it to the
 * data table, as does a value that would cover another bar or label.
 */
function valueLabels(chart: Chart, view: vega.View): Label[] {
  const { flip } = layout(chart);
  const stacked = chart.type === "stacked" && chart.series.length > 1;
  const bars: { row: unknown; value: number; x1: number; y1: number; x2: number; y2: number }[] =
    [];
  walk(view, (item, dx, dy) => {
    const { datum, bounds } = item;
    const value = Number(datum?.y ?? Number.NaN);
    if (item.mark?.marktype !== "rect" || !bounds || !Number.isFinite(value)) return;
    bars.push({
      row: datum?.row,
      value,
      x1: bounds.x1 + dx,
      y1: bounds.y1 + dy,
      x2: bounds.x2 + dx,
      y2: bounds.y2 + dy,
    });
  });
  const HEIGHT = 12;
  const GAP = 6;
  const taken: Box[] = [];
  const labels: Label[] = [];
  for (const bar of bars) {
    const text = format(bar.value);
    const width = guess(text, 12);
    const up = bar.value >= 0;
    const [long, thick] = flip
      ? [bar.x2 - bar.x1, bar.y2 - bar.y1]
      : [bar.y2 - bar.y1, bar.x2 - bar.x1];
    const fits = flip
      ? long >= width + 2 * GAP && thick >= HEIGHT + 4
      : long >= HEIGHT + 2 * GAP && thick >= width + 8;
    const beyond = (other: typeof bar) =>
      flip
        ? up
          ? other.x2 > bar.x2
          : other.x1 < bar.x1
        : up
          ? other.y1 < bar.y1
          : other.y2 > bar.y2;
    const last =
      !stacked ||
      !bars.some((other) => other.row === bar.row && other.value >= 0 === up && beyond(other));
    if (!fits && !last) continue;
    const [cx, cy] = [(bar.x1 + bar.x2) / 2, (bar.y1 + bar.y2) / 2];
    // Inside, a bar's value sits at its end, and a segment's in its middle. Past the end it's a gap beyond it.
    const middle = fits && stacked;
    const out = (fits ? -1 : 1) * (up ? 1 : -1);
    const x = !flip || middle ? cx : (up ? bar.x2 : bar.x1) + out * (GAP + width / 2);
    const y = flip || middle ? cy : (up ? bar.y1 : bar.y2) - out * (GAP + HEIGHT / 2);
    const box = { x: x - width / 2, y: y - HEIGHT / 2, w: width, h: HEIGHT };
    const covers = (other: Box) =>
      box.x < other.x + other.w &&
      other.x < box.x + box.w &&
      box.y < other.y + other.h &&
      other.y < box.y + box.h;
    if (
      taken.some(covers) ||
      (!fits &&
        bars.some(
          (other) =>
            other !== bar &&
            covers({ x: other.x1, y: other.y1, w: other.x2 - other.x1, h: other.y2 - other.y1 }),
        ))
    )
      continue;
    taken.push(box);
    labels.push({ x, y, text, fill: fits ? INK.background : INK.foreground });
  }
  return labels;
}

// The labels draw as one text mark over the chart, in the type Flint sets its own values in.
const LABELS: vega.Mark = {
  type: "text",
  from: { data: "cch_labels" },
  aria: false,
  encode: {
    enter: {
      x: { field: "x" },
      y: { field: "y" },
      text: { field: "text" },
      fill: { field: "fill" },
      align: { value: "center" },
      baseline: { value: "middle" },
      font: { value: "sans-serif" },
      fontSize: { value: 12 },
      fontWeight: { value: 500 },
    },
  },
};

/** Grows the value axis to reach every line, so a target past the data still crosses the plot. */
function widen(chart: Chart, compiled: vega.Spec, view: vega.View) {
  const values = chart.marks.flatMap((mark) => (mark.value === undefined ? [] : [mark.value]));
  const axis = valueAxis(chart);
  const scale = compiled.scales?.find((scale) => scale.name === axis);
  if (!values.length || !scale) return false;
  const domain: unknown = view.scale(axis).domain();
  if (!Array.isArray(domain)) return false;
  const [low, high] = domain.map(Number);
  const [least, most] = [Math.min(...values), Math.max(...values)];
  if (least >= low! && most <= high!) return false;
  if (least < low!) Reflect.set(scale, "domainMin", least);
  if (most > high!) Reflect.set(scale, "domainMax", most);
  return true;
}

/** Ticks from a round step that end at the first one past the data, among as many as fit `width`. */
function ticks(low: number, high: number, width: number) {
  const span = high - low || Math.abs(high) || 1;
  const magnitude = 10 ** Math.floor(Math.log10(span));
  let best: number[] = [];
  for (const scale of [magnitude / 10, magnitude])
    for (const factor of [1, 2, 2.5, 3, 4, 5]) {
      const step = factor * scale;
      const first = Math.floor(low / step) * step;
      const count = Math.round((Math.ceil(high / step) * step - first) / step);
      const values = Array.from({ length: count + 1 }, (_, index) =>
        Number((first + index * step).toPrecision(12)),
      );
      const room = Math.max(...values.map((value) => guess(format(value), 12))) + 12;
      if (count < 3 || values.length * room > width) continue;
      const reach = (list: number[]) => list.at(-1)! - list[0]!;
      if (!best.length || reach(values) < reach(best)) best = values;
    }
  return best.length ? best : [low, high];
}

/**
 * A dumbbell reads as rows of changes: a grid line at every tick and a guide along every row, rows close together, a
 * connector heavier than the grid, and each row's extremes printed beside its outer dots.
 */
function dumbbell(chart: Chart, spec: TopLevelSpec) {
  if (!("layer" in spec) || !spec.encoding) return;
  const { x } = spec.encoding;
  if (!x || !("field" in x)) return;
  const rows = chart.rows.map((row) => row.values.filter((value) => value !== undefined));
  const all = rows.flat().filter((value): value is number => Number.isFinite(value));
  if (!all.length) return;
  // Dumbbells install an explicit value domain, so include reference-line targets before deriving its bounds.
  const targets = chart.marks
    .filter(
      (mark) => mark.mark === "line" && mark.value !== undefined && Number.isFinite(mark.value),
    )
    .map((mark) => mark.value!);
  const range = [...all, ...targets];
  const width = Number(spec.config?.view?.continuousWidth) || layout(chart).width;
  let values = ticks(Math.min(...range), Math.max(...range), width);
  let [low, high] = [values[0]!, values.at(-1)!];
  if (low === high) {
    const center = low;
    const room = Math.max(1, Math.abs(center) * 0.1);
    low -= room;
    high += room;
    values = ticks(low, high, width);
    // A narrow axis may not fit four rounded ticks, but the sole data value must remain visible.
    if (!values.includes(center)) values = [...values, center].sort((a, b) => a - b);
  }
  // Each row's least value is printed left of its dot and its most right of its dot, when the two differ, so the scale
  // leaves each row room for its text, as a share of the span: the least sits `left` of the span in from the low
  // edge, and the most `right` of it in from the high edge.
  const ends = rows
    .filter((row) => row.length)
    .map((row) => {
      const least = Math.min(...row);
      const most = Math.max(...row);
      return {
        least,
        most,
        left: (guess(format(least), 12) + 24) / width,
        right: most > least ? (guess(format(most), 12) + 24) / width : 0,
      };
    });
  // On a plot too narrow for the text, padding for it would squeeze the dots into a sliver, so where the text would
  // take more than 60% of the plot, the table under the chart carries the numbers instead.
  const printed =
    Math.max(...ends.map((end) => end.left)) + Math.max(...ends.map((end) => end.right)) <= 0.6;
  if (printed) {
    // The span depends on the room, and the room on the span, so the span is found by iterating; with the shares at
    // most 60%, each pass cuts the shortfall to at most 60% of what it was.
    const [tickLow, tickHigh] = [low, high];
    for (let pass = 0; pass < 64; pass++) {
      const span = high - low;
      low = Math.min(tickLow, ...ends.map((end) => end.least - end.left * span));
      high = Math.max(tickHigh, ...ends.map((end) => end.most + end.right * span));
      if (high - low - span <= span * 1e-9) break;
    }
  }
  x.scale = { domain: [low, high], nice: false, zero: false };
  // Vega thins given values down to the tick count Flint sets, so the count is the values'.
  const grid = { grid: true, gridColor: INK.grid, gridWidth: 1 };
  x.axis = {
    ...("axis" in x && x.axis),
    ...grid,
    values,
    tickCount: values.length,
    labelFlush: false,
  };
  const { y } = spec.encoding;
  if (y) spec.encoding.y = { ...y, axis: { ...("axis" in y && y.axis), ...grid } };
  spec.height = { step: 36 };
  const [line, dots] = spec.layer;
  if (line && "mark" in line)
    line.mark = {
      type: "line",
      color: INK.muted,
      strokeWidth: 4,
      strokeOpacity: 0.55,
      strokeCap: "round",
      interpolate: "linear",
    };
  if (dots && "mark" in dots && dots.mark instanceof Object && dots.mark.type === "point")
    dots.mark = { ...dots.mark, size: 100 };
  // SAFETY: Vega-Lite field channels always carry a string field name when present.
  const valueField = x.field as string;
  // SAFETY: Vega-Lite row channels use the same string field-name contract.
  const rowField = y && "field" in y ? (y.field as string) : "x";
  const label = (side: "lo" | "hi") => ({
    transform: [
      {
        joinaggregate: [
          { op: "min" as const, field: valueField, as: "lo" },
          { op: "max" as const, field: valueField, as: "hi" },
        ],
        groupby: [rowField],
      },
      {
        filter:
          side === "lo"
            ? `datum[${JSON.stringify(valueField)}] === datum.lo`
            : `datum[${JSON.stringify(valueField)}] === datum.hi && datum.hi > datum.lo`,
      },
      // Series that tie at a row's end share one dot, so the row prints that value once.
      { window: [{ op: "row_number" as const, as: "nth" }], groupby: [rowField] },
      { filter: "datum.nth === 1" },
    ],
    mark: {
      type: "text" as const,
      align: side === "lo" ? ("right" as const) : ("left" as const),
      baseline: "middle" as const,
      dx: side === "lo" ? -10 : 10,
      fontSize: 12,
      fill: INK.muted,
    },
    encoding: { text: { field: valueField, type: "quantitative" as const, format: ",.12~g" } },
  });
  if (printed) spec.layer.push(label("lo"), label("hi"));
}

const MINUTE = 60_000;
const DAY = 1440 * MINUTE;
const MONTHS = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(" ");
// Steps a timeline ticks at: minutes and hours from midnight, days, weeks from a Monday, and months from January.
const CLOCK = [1, 5, 10, 15, 30, 60, 120, 180, 360, 720].map((minutes) => minutes * MINUTE);
const CALENDAR = [1, 2, 7, 14].map((days) => days * DAY);
const SEASONS = [1, 2, 3, 6, 12, 24, 60, 120];

/**
 * Ticks for a timeline in UTC, at the shortest step whose labels fit `width`, three or more of them, from the first
 * one at or before the data to the first one past it. Each is labeled with what changed since the one before: the time, and
 * the day where it turns; the day, and the year where it turns; or the month, and the year in January.
 */
function timeTicks(low: number, high: number, width: number, kind: XKind) {
  const pad = (value: number) => String(value).padStart(2, "0");
  type Unit = "minute" | "day" | "month" | "year";
  const label = (time: number, previous: number | undefined, unit: Unit) => {
    const date = new Date(time);
    const before = previous === undefined ? undefined : new Date(previous);
    const [year, month, day] = [date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()];
    const newYear = before?.getUTCFullYear() !== year;
    if (unit === "year") return String(year);
    if (unit === "month") return `${MONTHS[month]}${newYear ? ` ${year}` : ""}`;
    const days = `${MONTHS[month]} ${day}`;
    if (unit === "day") return newYear ? `${days}, ${year}` : days;
    const clock = `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`;
    return before?.getUTCDate() === day && before.getUTCMonth() === month
      ? clock
      : `${days}, ${clock}`;
  };
  // Ticks sit evenly apart, so each pair of neighboring labels needs half of each one's width and a gap between them.
  const fits = (values: number[], unit: Unit) => {
    const labels = values.map((value, index) => label(value, values[index - 1], unit));
    const apart = width / (values.length - 1);
    return values.length >= 3 &&
      labels.every(
        (text, index) =>
          !index || (guess(text, 12) + guess(labels[index - 1]!, 12)) / 2 + 12 <= apart,
      )
      ? labels
      : undefined;
  };
  const options: { values: number[]; unit: Unit }[] = [];
  const steps = kind === "time" ? [...CLOCK, ...CALENDAR] : kind === "date" ? CALENDAR : [];
  for (const step of steps) {
    // Weeks start on a Monday, and 1970 started on a Thursday.
    const offset = step >= 7 * DAY ? 4 * DAY : 0;
    const first = Math.floor((low - offset) / step) * step + offset;
    const count = Math.ceil((high - first) / step);
    if (count > 60) continue;
    const values = Array.from({ length: count + 1 }, (_, index) => first + index * step);
    options.push({ values, unit: step < DAY ? "minute" : "day" });
  }
  const start = new Date(low);
  for (const months of kind === "year" ? SEASONS.filter((months) => months % 12 === 0) : SEASONS) {
    const first = Math.floor((start.getUTCFullYear() * 12 + start.getUTCMonth()) / months) * months;
    const values: number[] = [];
    for (let month = first; values.length < 62; month += months) {
      values.push(Date.UTC(Math.floor(month / 12), month % 12));
      if (values.at(-1)! >= high) break;
    }
    options.push({ values, unit: months % 12 ? "month" : "year" });
  }
  for (const { values, unit } of options) {
    const labels = fits(values, unit);
    if (labels) return { values, labels };
  }
  const values = [low, high];
  // Too narrow for any step: the ends alone, still in the table's unit.
  const unit: Unit =
    kind === "year" ? "year" : kind === "month" ? "month" : kind === "time" ? "minute" : "day";
  return { values, labels: values.map((value, index) => label(value, values[index - 1], unit)) };
}

/**
 * A gantt reads top to bottom in table order, each row named by its task, over a grid line at every tick. Its
 * milestones, rows that end where they start, are diamonds, and every other bar prints its duration past its end.
 */
function gantt(chart: Chart, spec: TopLevelSpec) {
  if (!("layer" in spec)) return;
  const [bars, durations] = spec.layer;
  if (!bars || !("encoding" in bars) || !bars.encoding) return;
  const { x, y, color } = bars.encoding;
  if (!x || !y || !("field" in x) || !("field" in y)) return;
  const number = chart.scale === "number";
  const spans = chart.rows.flatMap(({ values: [start, end] }) =>
    start === undefined || end === undefined ? [] : [{ start, end }],
  );
  if (!spans.length) return;
  const width = Number(spec.config?.view?.continuousWidth) || layout(chart).width;
  let low = Math.min(...spans.map((span) => span.start));
  let high = Math.max(...spans.map((span) => span.end));
  // A chart of one milestone spans a step of the table's unit to each side of it.
  if (low === high) {
    const room = {
      number: Math.max(1, Math.abs(low) * 0.1),
      year: 366 * DAY,
      month: 31 * DAY,
      date: DAY,
      time: 60 * MINUTE,
    }[chart.scale ?? "number"];
    [low, high] = [low - room, high + room];
  }
  // The axis ticks at round steps from the first one at or before the data, as on a dumbbell. Flint pads the scale for
  // the durations on both sides, which runs a timeline from 0 back to -2, so the axis ends at the data instead, and
  // runs on past it only as far as the widest duration needs.
  const times = number ? undefined : timeTicks(low, high, width, chart.scale ?? "date");
  const values = times?.values ?? ticks(low, high, width);
  const from = values[0]!;
  let to = values.at(-1)!;
  for (const { start, end } of spans) {
    if (end <= start) continue;
    const room = guess(duration(chart, start, end), 12) + 12;
    to = Math.max(to, from + ((end - from) * width) / (width - room));
  }
  const labelExpr = times?.labels.reduceRight(
    (rest, text, index) => `+datum.value === ${values[index]} ? ${JSON.stringify(text)} : ${rest}`,
    "''",
  );
  // Dates read in UTC, as the plugin read them, so a chart shows the same days wherever it's drawn.
  const scale = {
    domain: [from, to],
    nice: false,
    zero: false,
    ...(!number && { type: "utc" as const }),
  };
  const names = chart.rows.reduceRight(
    (rest, row, index) =>
      `datum.value === ${JSON.stringify(String(index))} ? ${JSON.stringify(row.x)} : ${rest}`,
    "''",
  );
  bars.encoding.y = { ...y, sort: null, axis: { ...("axis" in y && y.axis), labelExpr: names } };
  bars.encoding.x = {
    ...x,
    scale,
    axis: {
      ...("axis" in x && x.axis),
      grid: true,
      gridColor: INK.grid,
      gridWidth: 1,
      // The theme hides the value axis where values sit on the marks, but a duration doesn't say when a bar starts.
      labels: true,
      labelFlush: false,
      // Vega thins given values down to the tick count Flint sets, so the count is the values'. Vega-Lite reads a
      // number on a time axis as a year, so times go in as dates.
      values: number
        ? values
        : values.map((value) => {
            const date = new Date(value);
            return {
              utc: true,
              year: date.getUTCFullYear(),
              month: date.getUTCMonth() + 1,
              date: date.getUTCDate(),
              hours: date.getUTCHours(),
              minutes: date.getUTCMinutes(),
            };
          }),
      tickCount: values.length,
      ...(labelExpr && { labelExpr }),
    },
  };
  // Flint prints a date's duration in days whatever its span, so the plugin's own takes its place.
  spec.transform = spec.transform?.filter((step) => !("as" in step && step.as === "__gantt_label"));
  if (durations && "mark" in durations && durations.encoding?.x) {
    durations.transform = [{ filter: "datum.end > datum.start" }];
    durations.encoding.text = { field: "duration", type: "nominal" };
    durations.mark = { type: "text", align: "left", baseline: "middle", dx: 6, fill: INK.muted };
    durations.encoding.x = { ...durations.encoding.x, scale };
    if (durations.encoding.y) durations.encoding.y = { ...durations.encoding.y, sort: null };
  }
  spec.layer.splice(1, 0, {
    transform: [{ filter: "datum.end === datum.start" }],
    mark: { type: "point", shape: "diamond", filled: true, size: 160, opacity: 1 },
    encoding: {
      y: { field: y.field, type: "nominal", sort: null },
      x: { field: x.field, type: "type" in x ? x.type : "quantitative", scale },
      ...(color ? { color } : { color: { value: SERIES[0] } }),
    },
  });
  spec.height = { step: GANTT_STEP };
}

/** Draws a compiled Vega spec to an SVG string, and returns the view for finding where its marks sit. */
async function render(compiled: vega.Spec, loader?: vega.Loader) {
  // Vega compiles its expressions with `new Function` unless told to interpret them, and Cloudflare Workers, where
  // documents like these often render, forbid that.
  const options: vega.ViewOptions = {
    renderer: "none",
    logLevel: None,
    expr: expressionInterpreter,
  };
  if (loader) options.loader = loader;
  const view = new View(parse(compiled, undefined, { ast: true }), options);
  // Vega gives every group a role for screen readers, which the one `role="img"` hides anyway, an empty foreground
  // path, and float noise such as `10.000000000000021`. Only tags change, since text holds the table's own numbers,
  // and Vega escapes `>` in attributes.
  const svg = (await view.toSVG())
    .replace(/<path class="foreground"[^>]* d=""[^>]*\/>/g, "")
    .replace(/<[^>]+>/g, (tag) =>
      tag
        .replace(/ (?:role|aria-roledescription|aria-hidden)="[^"]*"/g, "")
        .replace(/(\.\d\d)\d+/g, "$1"),
    );
  return { view, svg };
}

/**
 * Draws a chart to an SVG string at the size Flint laid it out for, so its text reads at the size it was set, and
 * finds where each of its marks sits.
 */
export async function draw(chart: Chart): Promise<{ svg: string; boxes: Map<number, Box> }> {
  // SAFETY: Flint declares its output `any`; it is a Vega-Lite spec, and compile() checks it at runtime.
  const spec: TopLevelSpec = assembleVegaLite(input(chart));
  spec.background = "transparent";
  // Flint leaves room above for a headline; the figure's caption is the title, so only the axis title and legend
  // need it, and Vega-Lite's autosize makes room for those.
  spec.padding = PADDING;
  // With several series no one header names the numbers, and Flint would title the axis with the field, `y`. A
  // waterfall's legend sits where its axis title would, and its layers draw running totals rather than `y`.
  const waterfall = chart.type === "waterfall";
  if (chart.series.length > 1 || waterfall)
    for (const unit of units(spec))
      for (const channel of "encoding" in unit ? [unit.encoding?.x, unit.encoding?.y] : [])
        if (channel && "field" in channel && (waterfall || channel.field === "y"))
          channel.title = null;
  // Grid lines run across only, as in shadcn/ui. The theme hides the value axis where numbers sit on the marks, but a
  // waterfall prints none. Its steps read flat when they fit side by side, and Flint angles them when they don't.
  // Flint plans the plot's width, as pixels or as a step per band, so each step's share says whether its label fits
  // flat.
  const planned: unknown = Reflect.get(spec, "width");
  const step =
    Number(Reflect.get(Object(planned), "step")) ||
    (Number(planned) || layout(chart).width) / chart.rows.length;
  // A step's few words wrap onto up to three lines under it before its labels turn sideways.
  const wrapped = chart.rows.map((row) => wrap(row.x, step - 12));
  const flat = wrapped.every(
    (lines) => lines.length <= 3 && lines.every((line) => guess(line, 12) <= step - 12),
  );
  const labelExpr = wrapped.reduceRight(
    (rest, lines, index) =>
      lines.length > 1
        ? `datum.label === ${JSON.stringify(chart.rows[index]!.x)} ? ${JSON.stringify(lines)} : ${rest}`
        : rest,
    "datum.label",
  );
  // Flint scales its type with the plot, from 13.5px down to 8px when long labels leave the plot narrow, and ignores
  // the theme's sizes, so text is set to shadcn/ui's 12px here. Labels that don't fit are thinned or cut instead.
  const TYPE = { labelFontSize: 12, titleFontSize: 12 };
  spec.config = {
    ...spec.config,
    // The SVG is one `role="img"` labeled by its caption, and the table under it is what screen readers and agents
    // read, so a label on every bar only repeats the table.
    aria: false,
    // shadcn/ui's tick margin: with no axis lines, labels need the room to stay apart where the axes meet.
    axisX: {
      ...spec.config?.axisX,
      ...TYPE,
      grid: false,
      labelPadding: 8,
      titlePadding: 10,
      // Labels that would touch are dropped, every other one, rather than drawn over each other.
      labelOverlap: "greedy",
      labelSeparation: 6,
      // Flint anchors a waterfall's labels at their end, for angled text; flat ones center under their step.
      ...(waterfall &&
        (flat
          ? {
              labelAngle: 0,
              labelAlign: "center",
              labelBaseline: "top",
              labelLimit: 160,
              labelExpr,
            }
          : { labelLimit: 140 })),
    },
    axisY: {
      ...spec.config?.axisY,
      ...TYPE,
      labelPadding: 8,
      ...(waterfall && { labels: true, grid: true, gridColor: INK.border }),
    },
    // Vega guesses text widths without a font, short for CJK and emoji, so legend entries get room to spare.
    legend: {
      ...spec.config?.legend,
      ...TYPE,
      columns: legendColumns(chart, layout(chart).width),
      columnPadding: 20,
      rowPadding: 10,
      labelLimit: 200,
    },
    // An area is outlined along its top, so overlapping series stay readable through the translucent fill.
    area: { ...spec.config?.area, line: { strokeWidth: 2 } },
    // Vega-Lite draws points at 0.7 opacity, which muddies their colors on a dark page.
    point: { ...spec.config?.point, opacity: 1 },
    circle: { ...spec.config?.circle, opacity: 1 },
  };
  // Flint names its ticks when it labels every point, and leaves Vega to pick them otherwise.
  const pinned = units(spec).some(
    (unit) =>
      "encoding" in unit &&
      unit.encoding?.x &&
      "axis" in unit.encoding.x &&
      unit.encoding.x.axis &&
      "values" in unit.encoding.x.axis,
  );
  // Flint also sets axes and legends on the encodings, which win over the config, so the same rules go there. A
  // waterfall's first step gets room from the axis corner, where its label would meet the value axis's 0.
  for (const unit of units(spec)) {
    const text = "mark" in unit && unit.mark instanceof Object && unit.mark.type === "text";
    if ("mark" in unit && unit.mark instanceof Object && unit.mark.type === "text")
      unit.mark = { ...unit.mark, fontSize: TYPE.labelFontSize };
    if (!("encoding" in unit) || !unit.encoding) continue;
    // Flint writes an area's names in white, which fades on its translucent fill. The color field stays, since it
    // stacks the names in the order of the areas they sit in.
    const named = unit.encoding.color;
    if (text && chart.type === "area" && named && "scale" in named && named.scale)
      unit.encoding.color = { ...named, scale: { ...named.scale, range: [INK.foreground] } };
    // Flint orders a pie's slices by name and its legend by row, so the slices take the table's order too, clockwise
    // from twelve o'clock.
    if (chart.type === "pie" && unit.encoding.order)
      unit.encoding.order = { field: "row", type: "quantitative" };
    const { color, x, y } = unit.encoding;
    // Vega-Lite pulls the end labels of a time axis inside the plot, off the points they name. Where Flint labels
    // every point, they center under their points instead, and the points keep clear of the plot's ends by about half
    // a label so the first doesn't meet the value axis's 0 in the corner. Padding a scale whose ticks Vega picks would
    // add one before the first point, in that corner.
    const time =
      (chart.type === "line" || chart.type === "area") &&
      pinned &&
      x &&
      "type" in x &&
      x.type === "temporal"
        ? x
        : undefined;
    if (time) time.scale = { ...("scale" in time && time.scale), padding: 24 };
    if (color && "legend" in color && color.legend)
      color.legend = { ...color.legend, columns: legendColumns(chart, layout(chart).width) };
    for (const channel of [x, y])
      if (channel && "axis" in channel && channel.axis)
        channel.axis = {
          ...channel.axis,
          labelPadding: 8,
          labelOverlap: "greedy",
          labelSeparation: 6,
          ...(channel === time && {
            labelFlush: false,
            // "Apr 2026" under every month is too wide for its step, so overlap hides some; the year is said once,
            // and again where it turns.
            ...(chart.xKind === "month" && {
              format: undefined,
              labelExpr:
                'utcFormat(datum.value, datum.index === 0 || utcmonth(datum.value) === 0 ? "%b %Y" : "%b")',
            }),
          }),
        };
    // Vega-Lite rounds a stack as a whole, which costs a clipped group per bar, so bars that stack nothing don't stack.
    // Rows that repeat an `x`, which the plugin reports, still stack rather than hide one behind the other.
    if (chart.type === "bar" && new Set(chart.rows.map((row) => row.x)).size === chart.rows.length)
      for (const channel of [x, y])
        if (channel && "field" in channel && channel.field === "y") channel.stack = null;
    if (waterfall && x && "field" in x && x.field === "x")
      x.scale = { ...("scale" in x && x.scale), paddingOuter: flat ? 0.4 : 1 };
  }
  // Flint colors a waterfall's steps from its palette when the data lacks one kind, so the kinds are pinned.
  if (waterfall && "layer" in spec)
    for (const layer of spec.layer)
      if ("encoding" in layer && layer.encoding?.color && "field" in layer.encoding.color)
        layer.encoding.color = {
          ...layer.encoding.color,
          scale: {
            domain: ["total", "increase", "decrease"],
            range: [INK.muted, SERIES[2], SERIES[4]],
          },
        };
  // Flint prints each step's running total over it and its change inside it, in white on the step, so a total reads
  // twice and a short step loses its change. One number per step reads instead, outside it: a total's value, or a
  // step's change.
  if (waterfall && "layer" in spec) {
    const isText = (layer: (typeof spec.layer)[number]) =>
      "mark" in layer && layer.mark instanceof Object && layer.mark.type === "text";
    const inside = (layer: (typeof spec.layer)[number]) =>
      "encoding" in layer &&
      layer.encoding?.text &&
      "field" in layer.encoding.text &&
      layer.encoding.text.field === "__wf_delta_text";
    // Numbers wider than their step would run into their neighbors', so a crowded waterfall leaves them to the axis.
    const values = chart.rows.map((row) => row.values[0] ?? 0);
    // Keep the inferred final-total rule in sync with Flint: a final value is a
    // total when it reconciles with the preceding cumulative within 0.5%.
    let preceding = 0;
    for (const value of values.slice(0, -1)) preceding += value;
    const finalIsTotal =
      values.length > 1 &&
      Number.isFinite(preceding) &&
      Number.isFinite(values.at(-1)) &&
      Math.abs(values.at(-1)! - preceding) <= Math.max(1e-6, 0.005 * Math.abs(preceding));
    const widest = Math.max(
      ...chart.rows.map((row, index) => {
        const value = row.values[0] ?? 0;
        const signed =
          index > 0 && !(index === values.length - 1 && finalIsTotal) && value > 0 ? "+" : "";
        return guess(`${signed}${Math.round(value).toLocaleString("en-US")}`, 12);
      }),
    );
    const numbers = widest + 6 <= step;
    spec.layer = spec.layer.filter((layer) => !isText(layer) || (numbers && !inside(layer)));
    // Flint pads the value axis for the labels from levels that add the end total to the sum it closes, so it runs
    // to twice the top and below zero. The levels here stop at the end total, and only a side with a label is padded.
    const levels = [0];
    for (const [index] of chart.rows.entries()) {
      const value = values[index];
      const last = levels.at(-1)!;
      levels.push(
        index === chart.rows.length - 1 && index > 0 && finalIsTotal ? last : last + value,
      );
    }
    const [low, high] = [Math.min(...levels), Math.max(...levels)];
    const pad = numbers ? (high - low || 1) * 0.08 : 0;
    for (const layer of spec.layer) {
      if (!("encoding" in layer) || !layer.encoding) continue;
      const { y } = layer.encoding;
      if (y && "field" in y && y.field === "__wf_prev_sum")
        layer.encoding.y = {
          ...y,
          scale: { domain: [low < 0 ? low - pad : 0, high + pad], nice: true },
        };
      if ("mark" in layer && layer.mark instanceof Object && layer.mark.type === "text") {
        layer.mark = { ...layer.mark, fill: INK.foreground };
        // Flint's inner delta layer has an encoding-level color, which takes
        // precedence over mark.fill. Remove it so all values use the theme ink.
        delete layer.encoding.color;
        layer.encoding.text = { field: "__wf_delta_text", type: "nominal" };
      }
    }
  }
  // A line or an area is one shape per series, so marks on them find their points in an invisible layer.
  if (chart.marks.length && (chart.type === "line" || chart.type === "area") && "layer" in spec) {
    const [first] = spec.layer;
    // An area stacks its series, and points only stack when told to.
    if (first && "mark" in first && first.encoding) {
      const encoding = { ...first.encoding };
      if (chart.type === "area" && encoding.y && "field" in encoding.y)
        encoding.y = { ...encoding.y, stack: "zero" };
      spec.layer.push({ mark: { type: "point", opacity: 0 }, encoding });
    }
  }
  if (chart.type === "dumbbell") dumbbell(chart, spec);
  if (chart.type === "gantt") gantt(chart, spec);
  if (chart.labels && "layer" in spec)
    spec.layer = spec.layer.filter((layer) => !("__themeSynthetic" in layer));
  // Lines and labels are placed from the drawn chart, so a chart with them is drawn again with them in place.
  const compiled = compile(spec, { logger: quiet }).spec;
  let { view, svg } = await render(compiled);
  if (widen(chart, compiled, view)) {
    view.finalize();
    ({ view, svg } = await render(compiled));
  }
  const labels = chart.labels ? valueLabels(chart, view) : [];
  if (labels.length) {
    compiled.data = [...(compiled.data ?? []), { name: "cch_labels", values: labels }];
    compiled.marks = [...(compiled.marks ?? []), LABELS];
    view.finalize();
    ({ view, svg } = await render(compiled));
  }
  const [, width = "0", height = "0"] = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(svg) ?? [];
  const found = boxes(chart, view, Number(width), Number(height));
  view.finalize();
  return { svg, boxes: found };
}

// The house look, set where a spec leaves it: shadcn/ui's charts, in the inks the stylesheet swaps for the page's.
const SPEC_CONFIG = {
  aria: false,
  font: "sans-serif",
  view: { stroke: null },
  range: { category: [...SERIES] },
  mark: { color: SERIES[0] },
  bar: { cornerRadiusEnd: 4 },
  line: { strokeWidth: 2 },
  axis: {
    domain: false,
    ticks: false,
    grid: true,
    gridColor: INK.border,
    labelColor: INK.muted,
    titleColor: INK.muted,
    labelFontSize: 12,
    titleFontSize: 12,
    titleFontWeight: "normal",
    labelPadding: 8,
    titlePadding: 10,
  },
  axisX: { grid: false },
  legend: { labelColor: INK.muted, titleColor: INK.muted, labelFontSize: 12, titleFontSize: 12 },
  text: { color: INK.foreground, fontSize: 12 },
  title: { color: INK.foreground },
} as const;

// A document's spec may not reach the network or the disk where it's parsed: the table is its only data.
const sealed = vega.loader();
sealed.load = () =>
  Promise.reject(new Error("a chart's spec can't load files or URLs; its data is the table"));
// An empty href loads no image and makes no link.
sealed.sanitize = () => Promise.resolve({ href: "" });

// Composed Vega-Lite views can carry their own data declarations. The table is the sole data source,
// so remove those declarations at every depth before injecting the table values at the root.
function withoutData(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(withoutData);
  if (!(value instanceof Object)) return value;
  // SAFETY: JSON objects have string keys, and this value is known to be a non-array object.
  const record = value as Record<string, unknown>;
  const from = record.from;
  if ("lookup" in record && from instanceof Object && "data" in from) {
    throw new Error(
      "lookup transforms with from.data are unsupported because the table is the only data source",
    );
  }
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => key !== "data")
      .map(([key, child]) => [key, withoutData(child)]),
  );
}

/** Draws a Vega-Lite spec over the chart's table, in the house look wherever the spec sets none. */
export async function drawSpec(chart: SpecChart): Promise<{ svg: string }> {
  const { config, ...rest } = chart.spec;
  // SAFETY: chart.spec is parsed JSON, so rest is always a plain object and the sanitizer preserves that shape.
  const sanitized = withoutData(rest) as Record<string, unknown>;
  // The spec came from JSON, and compile() checks it at runtime and throws on what it can't draw.
  const spec: TopLevelSpec = JSON.parse(
    JSON.stringify({
      background: "transparent",
      padding: PADDING,
      ...sanitized,
      data: { values: chart.values },
      config: Object.assign({}, SPEC_CONFIG, config),
    }),
  );
  const { view, svg } = await render(compile(spec, { logger: quiet }).spec, sealed);
  view.finalize();
  // A link in the drawing would run whatever URL the spec gives it, `javascript:` included.
  return { svg: svg.replace(/<\/?a\b[^>]*>/g, "") };
}
