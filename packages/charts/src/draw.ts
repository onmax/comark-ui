import type { ChartAssemblyInput, ThemeSpec } from "flint-chart";
import { assembleVegaLite } from "flint-chart/vegalite";
import * as vega from "vega";
import { expressionInterpreter } from "vega-interpreter";
import type { TopLevelSpec } from "vega-lite";
import type { Field } from "vega-lite/types_unstable/channeldef.js";
import type { LayerSpec, UnitSpec } from "vega-lite/types_unstable/spec/index.js";
import { compile } from "vega-lite";
import { INK, SERIES } from "./colors.ts";
import type { Chart, FlowChart, SpecChart, XKind } from "./read.ts";

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
export const guess = (text: string, size: number) => {
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
  // A report's charts: no axis lines or ticks, faint dotted grid lines, bars barely rounded, straight lines between the
  // points they join, and 12px labels.
  structure: {
    axis: {
      categorical: { line: "omit", ticks: "omit" },
      measure: { line: "omit", ticks: "omit" },
    },
    grid: { measure: "quiet", category: "omit", style: "dotted", dash: [2, 3], zero: "omit" },
    frame: "omit",
    baseline: "omit",
  },
  marks: {
    cornerRadius: 2,
    strokeWeight: 1.5,
    // A smoothed line passes through values the table doesn't hold, and overshoots between steep steps.
    interpolation: "linear",
    fillOpacity: 0.4,
    point: { presence: "omit" },
  },
  // Values print only with `labels`; without it the axis and the data table carry them.
  dataLabels: { show: "never", placement: "outsideMark", inkMode: "fixed" },
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

/** The first three of a label's lines, the third cut back by words to fit `room` with an ellipsis. */
function clip(lines: string[], room: number) {
  if (lines.length <= 3) return lines;
  const words = lines.slice(2).join(" ").split(" ");
  while (words.length > 1 && guess(`${words.join(" ")}…`, 12) > room) words.pop();
  return [lines[0]!, lines[1]!, `${words.join(" ")}…`];
}

// A top legend is one row unless told otherwise, so it wraps into as many columns as fit the card.
function legendColumns(chart: Chart, room = PLOT) {
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

const NAME_LIMIT = 200;

/**
 * Whether a line chart names its series at their ends, in their colors, rather than in a legend over the plot: a
 * reader finds a line by its name where it ends, without matching swatches. Past eight the names would stack;
 * long names use the width-limited legend so their padding cannot consume the plot.
 */
const endLabeled = (chart: Chart) =>
  chart.type === "line" &&
  chart.series.length > 1 &&
  chart.series.length <= 8 &&
  chart.series.every((name) => guess(name, 12) <= NAME_LIMIT);

// A line marks each of its points while they're few enough to stay apart.
const MOST_POINTS = 40;

// A plot's widest, and the room it shares with its labels: about a report column's width, which the stylesheet then
// fills, so a chart spans the column as a dashboard's does.
const PLOT = 640;
const ROOM = 720;
// A plot's height, about half its width, so a trend's slope reads as it does on a dashboard.
const TALL = 340;
// Every chart's drawn width, padding included.
const WIDTH = ROOM + 24;

/** The share of a band left empty so an upright bar is at most `widest` pixels, as on a dashboard, never under `least`. */
const slim = (chart: Chart, widest: number, least = 0.35) =>
  Math.min(0.85, Math.max(least, 1 - widest / ((WIDTH - 80) / chart.rows.length)));

// The most bars an upright plot holds at a readable width.
const MOST_UPRIGHT = 40;

/** The decisions a chart's shape forces before Flint lays it out. */
function layout(chart: Chart) {
  const { type } = chart;
  // A gantt's bars run sideways from the task names, and its numbers are the durations printed past each bar.
  if (type === "gantt")
    return {
      flip: true,
      bars: chart.rows.length,
      width: Math.round(Math.max(200, Math.min(PLOT, ROOM - (7 * longest(chart) + 40)))),
    };
  const bars = chart.rows.length * (type === "bar" ? chart.series.length : 1);
  // Bars stand upright unless `horizontal` turns them, or there are more than a plot's width holds, which would drop some.
  const flip =
    type === "dumbbell" ||
    ((type === "bar" || type === "stacked") && (!!chart.horizontal || bars > MOST_UPRIGHT));
  // The plot leaves about 670px for the chart. Labels sit beside the plot, so the plot gets what the widest of them leaves: names on
  // a sideways chart, and values on an upright one.
  const numbers = chart.rows.flatMap((row) => row.values.filter((value) => value !== undefined));
  const valueLabel =
    Math.max(...numbers.map((value) => compact(Math.round(value), chart.unit).length)) * 7;
  const ends = endLabeled(chart)
    ? Math.max(...chart.series.map((name) => guess(name, 12))) + 24
    : 0;
  const labels = flip ? 7 * longest(chart) + 40 : valueLabel + 40 + ends;
  const width = Math.round(Math.max(200, Math.min(PLOT, ROOM - labels)));
  return { flip, bars, width };
}

// Field names are fixed, since Vega-Lite reads dots and brackets in a column's name as a path into the row.
function input(chart: Chart): ChartAssemblyInput {
  const { type } = chart;
  if (type === "gantt") return ganttInput(chart);
  const many = chart.series.length > 1;
  const { flip, bars, width } = layout(chart);
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
    // Drawn apart from Flint, by `heatmap()`.
    heatmap: "Heatmap",
  }[type];
  return {
    data: { values },
    semantic_types: { x: SEMANTIC[kind], y: "Quantity", series: "Category" },
    field_display_names: { x: chart.x, y: many ? "" : chart.series[0]!, series: "" },
    chart_spec: {
      chartType,
      encodings,
      baseSize: { width, height: TALL },
      // Flint grows a crowded chart, but only downward: the width is already what the labels leave. Past the canvas
      // Flint drops rows and says "items omitted", so a sideways chart grows as tall as its bars need.
      canvasSize: { width, height: flip ? Math.max(640, bars * 20 + 200) : 640 },
      // Flint packs a band's bars together when some rows lack a series, but it finds the band from the column's
      // type, so over dates it sorts bars into lanes by their value, and some draw zero wide. Every band gets a lane per
      // series instead, as in most grouped bar charts.
      // A waterfall prints its numbers itself, apart from the theme's value labels, and only when asked. Its first and
      // last rows are always its totals, as the plugin checks them.
      chartProperties: {
        dodge: "global",
        ...(type === "waterfall" && { showTextLabels: !!chart.labels, totals: "both" }),
      },
    },
    options: { maxColorValues: SERIES.length },
    theme_spec: {
      ...theme,
      // With `labels` every bar prints its value, so Flint hides the value axis and leaves room past the bars. The
      // labels are the plugin's own, placed once the bars are drawn.
      ...(chart.labels &&
        (type === "bar" || type === "stacked") && {
          dataLabels: { ...theme.dataLabels, show: "always" },
        }),
      // The New York Times theme dots a line's ends, and on a dumbbell, which is all ends, that layer repaints some dots
      // in the first series' color.
      ...(type === "dumbbell" && { annotation: { ...theme.annotation, pointEmphasis: "never" } }),
      // Every chart with more than one series names them in a legend over the plot.
      legend: { ...theme.legend, maxSwatches: SERIES.length, placement: ["top"] },
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
      // The durations' layer keeps the spec layered, as the gantt's own layers need; without `labels` it's removed.
      chartProperties: { intervalLabels: true },
    },
    options: { maxColorValues: SERIES.length },
    theme_spec: {
      ...theme,
      legend: { ...theme.legend, maxSwatches: SERIES.length, placement: ["top"] },
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

// Shapes drawn one per value; lines, areas, and labels span several or don't mark a value. A mark also takes in the
// values printed on or beside its shapes, the text items of its row, so its stroke never runs through a number.
const SHAPES = new Set(["rect", "symbol", "arc"]);
// A mark keeps clear of the shape it circles, and a point gets a box big enough to draw around. A mark that draws
// nothing only leaves its arrow a hair short of the point, so the arrow reaches the data.
const PAD = 6;
export const PADDING = { left: 12, right: 12, top: 12, bottom: 12 };
const SMALLEST = 18;
// A circle mark loops a little past its box, so a chart with one keeps room under the plot for a loop around a bar
// and its name on the axis, above the notes.
const RING_ROOM = 20;
const BARE = 3;

interface SceneItem {
  x?: number;
  y?: number;
  bounds?: { x1: number; y1: number; x2: number; y2: number };
  datum?: { row?: unknown; series?: unknown; y?: unknown; value?: unknown };
  fill?: string;
  stroke?: string;
  mark?: { marktype?: string; role?: string };
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
// Charts with a band per row, whose axis names each row.
const BANDED = new Set(["bar", "stacked", "waterfall", "dumbbell"]);
// A line's box reaches this far to each side of it, so its stamp and its arrow sit on the line.
const LINE = 4;

export function boxes(
  chart: Chart | FlowChart,
  view: vega.View,
  width: number,
  height: number,
): Map<number, Box> {
  const found = new Map<number, Box>();
  // Vega draws the scene at its origin plus its padding, and origin() leaves the padding out.
  const [x0, y0] = view.origin();
  const padding = view.padding();
  const inset = typeof padding === "number" ? { left: padding, top: padding } : padding;
  const [left, top] = [x0 + (inset.left ?? 0), y0 + (inset.top ?? 0)];
  for (const mark of chart.marks) {
    let [x1, y1, x2, y2] = [Infinity, Infinity, -Infinity, -Infinity];
    if (mark.value !== undefined && chart.type !== "sankey") {
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
        if (!bounds || !datum) return;
        // A ring around a whole row of bars takes in the row's name on the axis too, so the stroke goes around it, not
        // through it. Elsewhere the axis holds ticks, which only share a row's name by chance.
        const name =
          mark.mark === "circle" &&
          chart.type !== "sankey" &&
          BANDED.has(chart.type) &&
          !mark.series &&
          item.mark?.role === "axis-label" &&
          mark.row !== undefined &&
          String(datum.value) === chart.rows[mark.row]?.x;
        if (!name) {
          if (!SHAPES.has(item.mark?.marktype ?? "") && item.mark?.marktype !== "text") return;
          if (datum.row !== mark.row || (mark.series && datum.series !== mark.series)) return;
        }
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

export const format = (value: number) =>
  value.toLocaleString("en-US", { maximumFractionDigits: 12 });

// A currency sign reads before its number, a percent or a times sign right after it, and a word after a space.
function affixes(unit = ""): [string, string] {
  if (/^\p{Sc}$/u.test(unit)) return [unit, ""];
  if (unit === "%" || unit === "×" || unit === "x") return ["", unit];
  return ["", unit && ` ${unit}`];
}

// Numbers from a thousand up read as their first three digits and a letter, as `22.2k` or `1.4M`: a reader compares
// magnitudes on a chart, and the table under it keeps every digit.
const SHORT: [number, string][] = [
  [1e9, "B"],
  [1e6, "M"],
  [1e3, "k"],
];

/** A number as a chart prints it: shortened from a thousand up, with its unit. */
export function compact(value: number, unit?: string) {
  const [before, after] = affixes(unit);
  const size = Math.abs(value);
  const short = SHORT.find(([from]) => size >= from);
  const body = short
    ? `${format(Number((size / short[0]).toPrecision(3)))}${short[1]}`
    : format(size);
  return `${value < 0 ? "-" : ""}${before}${body}${after}`;
}

/**
 * Ticks for a log scale: 1, 2, and 5 in every power of ten the numbers span, or the powers of ten alone when those
 * would crowd the axis, so each grid line marks a round number.
 */
function logTicks(low: number, high: number) {
  if (!(low > 0) || !Number.isFinite(high)) return [];
  const steps = (factors: number[]) => {
    const values: number[] = [];
    for (let power = Math.floor(Math.log10(low)); power <= Math.ceil(Math.log10(high)); power++)
      for (const factor of factors) {
        const value = Number((factor * 10 ** power).toPrecision(12));
        if (value >= low && value <= high) values.push(value);
      }
    return values;
  };
  const fine = steps([1, 2, 5]);
  return fine.length <= 8 ? fine : steps([1]);
}

/** The same as `compact`, as a Vega expression over `value`, for the labels Vega prints itself, such as an axis's. */
function compactExpr(value: string, unit?: string) {
  const [before, after] = affixes(unit);
  const size = `abs(${value})`;
  const body = SHORT.reduceRight(
    (rest, [from, letter]) =>
      `${size} >= ${from} ? format(${size} / ${from}, ".3~r") + "${letter}" : ${rest}`,
    `format(${size}, ",.12~r")`,
  );
  return `(${value} < 0 ? "-" : "") + ${JSON.stringify(before)} + (${body}) + ${JSON.stringify(after)}`;
}

interface Label {
  x: number;
  y: number;
  text: string;
  fill: string;
  row: unknown;
  series: unknown;
}

/**
 * Where each bar's value goes, in the root group's frame: just past a bar's end, or for a stack, its total past its end
 * and each segment's value inside it where it fits. A segment too thin for its value leaves it to the data table, as
 * does a value that would cover another bar or label.
 */
function valueLabels(chart: Chart, view: vega.View): Label[] {
  const { flip } = layout(chart);
  const stacked = chart.type === "stacked" && chart.series.length > 1;
  const bars: {
    row: unknown;
    series: unknown;
    value: number;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  }[] = [];
  walk(view, (item, dx, dy) => {
    const { datum, bounds } = item;
    const value = Number(datum?.y ?? Number.NaN);
    if (item.mark?.marktype !== "rect" || !bounds || !Number.isFinite(value)) return;
    bars.push({
      row: datum?.row,
      series: datum?.series,
      value,
      x1: bounds.x1 + dx,
      y1: bounds.y1 + dy,
      x2: bounds.x2 + dx,
      y2: bounds.y2 + dy,
    });
  });
  const HEIGHT = 12;
  const GAP = 6;
  // Values keep this far from each other and from the axes' labels, by their guessed widths, which run a little under
  // the drawn ones.
  const MARGIN = 6;
  const taken: Box[] = [];
  walk(view, (item, dx, dy) => {
    const { bounds } = item;
    if (item.mark?.role === "axis-label" && bounds)
      taken.push({
        x: bounds.x1 + dx,
        y: bounds.y1 + dy,
        w: bounds.x2 - bounds.x1,
        h: bounds.y2 - bounds.y1,
      });
  });
  const labels: Label[] = [];
  type Bar = (typeof bars)[number];
  // `inside` prints a stacked segment's number in white in its middle, or nothing when it doesn't fit. Otherwise
  // the number goes past the bar's end, as a dashboard does.
  const place = (bar: Bar, inside: boolean) => {
    const text = compact(bar.value, chart.unit);
    const width = guess(text, 11);
    const up = bar.value >= 0;
    const [long, thick] = flip
      ? [bar.x2 - bar.x1, bar.y2 - bar.y1]
      : [bar.y2 - bar.y1, bar.x2 - bar.x1];
    if (
      inside &&
      !(flip
        ? long >= width + 2 * GAP && thick >= HEIGHT + 4
        : long >= HEIGHT + 2 * GAP && thick >= width + 8)
    )
      return;
    const [cx, cy] = [(bar.x1 + bar.x2) / 2, (bar.y1 + bar.y2) / 2];
    const out = up ? 1 : -1;
    const x = !flip || inside ? cx : (up ? bar.x2 : bar.x1) + out * (GAP + width / 2);
    const y = flip || inside ? cy : (up ? bar.y1 : bar.y2) - out * (GAP + HEIGHT / 2);
    const box = { x: x - width / 2, y: y - HEIGHT / 2, w: width, h: HEIGHT };
    const covers = (other: Box, margin = MARGIN) =>
      box.x - margin < other.x + other.w &&
      other.x < box.x + box.w + margin &&
      box.y - margin < other.y + other.h &&
      other.y < box.y + box.h + margin;
    if (
      taken.some((other) => covers(other)) ||
      (!inside &&
        bars.some((other) =>
          covers({ x: other.x1, y: other.y1, w: other.x2 - other.x1, h: other.y2 - other.y1 }, 0),
        ))
    )
      return;
    taken.push(box);
    labels.push({
      x,
      y,
      text,
      fill: inside ? INK.background : INK.foreground,
      row: bar.row,
      series: bar.series,
    });
  };
  if (!stacked) {
    for (const bar of bars) place(bar, false);
    return labels;
  }
  // A number past a stack reads as its total, so that's what goes there: the sum of its segments on that side of
  // zero. A segment's own number goes only inside it, and an empty segment has none.
  const stacks = new Map<string, Bar>();
  for (const bar of bars) {
    if (bar.value === 0) continue;
    place(bar, true);
    // Use the rendered lane, since different timestamp spellings can share one position and stack together.
    const key = `${flip ? bar.y1 : bar.x1}\u0000${flip ? bar.y2 : bar.x2}\u0000${bar.value >= 0}`;
    const stack = stacks.get(key);
    stacks.set(
      key,
      stack
        ? {
            ...stack,
            value: stack.value + bar.value,
            x1: Math.min(stack.x1, bar.x1),
            y1: Math.min(stack.y1, bar.y1),
            x2: Math.max(stack.x2, bar.x2),
            y2: Math.max(stack.y2, bar.y2),
          }
        : { ...bar, series: undefined },
    );
  }
  for (const stack of stacks.values()) place(stack, false);
  return labels;
}

// Charts whose series are the table's columns, one color each.
const COLUMNS = new Set<Chart["type"]>(["bar", "stacked", "line", "area", "scatter", "dumbbell"]);

const sum = (values: (number | undefined)[], side: (value: number) => boolean) =>
  values.reduce<number>(
    (total, value) => (value !== undefined && side(value) ? total + value : total),
    0,
  );

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
      fontSize: { value: 11 },
      fontWeight: { value: 500 },
    },
  },
};

interface EndLabel {
  x: number;
  y: number;
  /** Where the line ends, which a short leader joins to the name when the name moved off its height. */
  x0: number;
  y0: number;
  text: string;
  fill: string;
  series: string;
}

// Names at the ends of lines keep a 12px line's box and a few pixels apart, so stacked names never touch.
const END_GAP = 20;

/**
 * Where each line's name goes, in the root group's frame: past the plot's right edge at the height its line ends,
 * pushed apart where two ends sit closer than a line of text, and kept inside the plot's height.
 */
function endLabels(chart: Chart, view: vega.View): EndLabel[] {
  const last = new Map<string, { x: number; y: number; fill: string }>();
  walk(view, (item, dx, dy) => {
    const { datum } = item;
    if (
      item.mark?.marktype !== "line" ||
      !datum ||
      item.x === undefined ||
      item.y === undefined ||
      !item.stroke
    )
      return;
    const series = String(datum.series);
    const seen = last.get(series);
    const x = item.x + dx;
    if (!seen || x > seen.x) last.set(series, { x, y: item.y + dy, fill: item.stroke });
  });
  const right = view.width() + 10;
  const ends = chart.series.flatMap((series) => {
    const end = last.get(series);
    return end ? [{ series, x0: end.x, y0: end.y, y: end.y, fill: end.fill }] : [];
  });
  ends.sort((a, b) => a.y - b.y);
  for (let index = 1; index < ends.length; index++)
    ends[index]!.y = Math.max(ends[index]!.y, ends[index - 1]!.y + END_GAP);
  // Pushed past the bottom, the stack moves back up as a whole.
  const over = (ends.at(-1)?.y ?? 0) - view.height();
  if (over > 0)
    for (let index = ends.length - 1; index >= 0; index--) {
      const floor = index === ends.length - 1 ? view.height() : ends[index + 1]!.y - END_GAP;
      ends[index]!.y = Math.min(ends[index]!.y, floor);
    }
  return ends.map((end) => ({ ...end, x: right, text: end.series }));
}

// A name in its line's color, and a faint leader from where the line ends.
const END_LABELS: vega.Mark[] = [
  {
    type: "rule",
    from: { data: "cch_ends" },
    aria: false,
    encode: {
      enter: {
        x: { signal: "datum.x0 + 4" },
        y: { field: "y0" },
        x2: { signal: "datum.x - 4" },
        y2: { field: "y" },
        stroke: { field: "fill" },
        strokeOpacity: { value: 0.5 },
        strokeWidth: { value: 1 },
      },
    },
  },
  {
    type: "text",
    from: { data: "cch_ends" },
    aria: false,
    encode: {
      enter: {
        x: { field: "x" },
        y: { field: "y" },
        text: { field: "text" },
        fill: { field: "fill" },
        align: { value: "left" },
        baseline: { value: "middle" },
        font: { value: "sans-serif" },
        fontSize: { value: 12 },
        fontWeight: { value: 500 },
      },
    },
  },
];

interface Stub {
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  row: unknown;
  series: unknown;
}

// How thick a zero bar draws: thinner than any bar that holds a value, so it reads as none.
const STUB = 1.5;

/**
 * A thin stroke in its series' color at the base of each bar worth zero, in the root group's frame. Vega draws such a
 * bar zero wide, so a grouped bar's empty lane looked like the gap between two steps, and its 0 like a stray label.
 */
function zeroBars(chart: Chart, view: vega.View): Stub[] {
  if (chart.type !== "bar") return [];
  const { flip } = layout(chart);
  const stubs: Stub[] = [];
  walk(view, (item, dx, dy) => {
    const { datum, bounds, fill } = item;
    if (item.mark?.marktype !== "rect" || !bounds || !fill) return;
    if (datum?.y === undefined || Number(datum.y) !== 0) return;
    const [x, y] = [bounds.x1 + dx, bounds.y1 + dy];
    stubs.push({
      ...(flip
        ? { x: x - STUB / 2, y, width: STUB, height: bounds.y2 - bounds.y1 }
        : { x, y: y - STUB / 2, width: bounds.x2 - bounds.x1, height: STUB }),
      fill,
      row: datum.row,
      series: datum.series,
    });
  });
  return stubs;
}

const ZEROS: vega.Mark = {
  type: "rect",
  from: { data: "cch_zeros" },
  aria: false,
  encode: {
    enter: {
      x: { field: "x" },
      y: { field: "y" },
      width: { field: "width" },
      height: { field: "height" },
      fill: { field: "fill" },
      fillOpacity: { value: 0.5 },
      cornerRadius: { value: STUB / 2 },
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
        left: (guess(compact(least, chart.unit), 12) + 24) / width,
        right: most > least ? (guess(compact(most, chart.unit), 12) + 24) / width : 0,
      };
    });
  // On a plot too narrow for the text, padding for it would squeeze the dots into a sliver, so where the text would
  // take more than 60% of the plot, the table under the chart carries the numbers instead.
  const printed =
    !!chart.labels &&
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
  const grid = { grid: true, gridColor: INK.grid, gridWidth: 1, gridDash: [2, 3] };
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
      {
        calculate: compactExpr(`datum[${JSON.stringify(valueField)}]`, chart.unit),
        as: "cch_text",
      },
    ],
    mark: {
      type: "text" as const,
      align: side === "lo" ? ("right" as const) : ("left" as const),
      baseline: "middle" as const,
      dx: side === "lo" ? -10 : 10,
      fontSize: 12,
      fill: INK.muted,
    },
    encoding: { text: { field: "cch_text", type: "nominal" as const } },
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
    if (!chart.labels || end <= start) continue;
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
      gridDash: [2, 3],
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
  if (!chart.labels) spec.layer.splice(1, 1);
  else if (durations && "mark" in durations && durations.encoding?.x) {
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
export async function render(compiled: vega.Spec, loader?: vega.Loader) {
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
// A heatmap's cells: this tall, as wide as the room allows between these, and red, amber, and green when the numbers
// rate something. Those three aren't series colors, so the stylesheet leaves them as they are in both themes, and the
// numbers on them stay dark.
const CELL = { height: 26, least: 30, most: 64 };
const RATING = ["#d9605c", "#d9a74a", "#4fa66a"];
const ON_RATING = "#141414";

/** A rating's color, from red at 0 through amber at a half to green at 1, mixed in sRGB as a hex Vega can draw. */
function rating(share: number) {
  const [from, to, at] =
    share < 0.5 ? [RATING[0]!, RATING[1]!, share * 2] : [RATING[1]!, RATING[2]!, share * 2 - 1];
  const channel = (hex: string, index: number) =>
    Number.parseInt(hex.slice(1 + index * 2, 3 + index * 2), 16);
  return `#${[0, 1, 2]
    .map((index) =>
      Math.round(channel(from, index) + (channel(to, index) - channel(from, index)) * at)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

/**
 * A heatmap, as a report lays out one table against another: a row per table row, a column per series, each cell
 * shaded by its number from the faintest to the full first series color, the columns' names over them, and every number
 * printed in its cell.
 */
async function heatmap(chart: Chart): Promise<{ svg: string; boxes: Map<number, Box> }> {
  const numbers = chart.rows.flatMap((row) => row.values.filter((value) => value !== undefined));
  const [low, high] = [Math.min(...numbers), Math.max(...numbers)];
  const share = (value: number) => (high === low ? 1 : (value - low) / (high - low));
  const names = Math.max(...chart.rows.map((row) => guess(row.x, 12))) + 16;
  const cell = Math.round(
    Math.max(CELL.least, Math.min(CELL.most, (ROOM - names) / chart.series.length)),
  );
  // A column's name turns to read upward when it's wider than its column, as a matrix's headers do.
  const turned = chart.series.some((name) => guess(name, 12) > cell - 6);
  const rated = chart.better !== undefined;
  const values = chart.rows.flatMap((row, number) =>
    chart.series.map((series, index) => {
      const value = row.values[index];
      const strength = value === undefined ? 0 : share(value);
      const text = value === undefined ? "–" : chart.labels ? compact(value, chart.unit) : "";
      return {
        x: row.x,
        series,
        y: value ?? null,
        row: number,
        text: guess(text, 12) + 6 <= cell * 0.94 ? text : "",
        opacity: value === undefined ? 1 : rated ? 1 : 0.12 + 0.88 * strength,
        fill:
          value === undefined
            ? INK.border
            : rated
              ? rating(chart.better === "lower" ? 1 - strength : strength)
              : SERIES[0],
        ink:
          value === undefined
            ? INK.muted
            : rated
              ? ON_RATING
              : strength > 0.55
                ? INK.background
                : INK.foreground,
      };
    }),
  );
  const fill = { field: "fill", type: "nominal" as const, scale: null, legend: null };
  const spec: TopLevelSpec = {
    background: "transparent",
    padding: PADDING,
    data: { values },
    width: cell * chart.series.length,
    height: CELL.height * chart.rows.length,
    encoding: {
      x: {
        field: "series",
        type: "nominal",
        sort: chart.series,
        scale: { paddingInner: 0.06, paddingOuter: 0 },
        axis: {
          orient: "top",
          title: null,
          labelAngle: turned ? -40 : 0,
          labelAlign: turned ? "left" : "center",
          labelBaseline: turned ? "middle" : "bottom",
          labelLimit: 180,
          labelPadding: 6,
          labelColor: INK.foreground,
        },
      },
      y: {
        field: "x",
        type: "nominal",
        sort: chart.rows.map((row) => row.x),
        scale: { paddingInner: 0.08, paddingOuter: 0 },
        axis: { title: null, labelLimit: 200, labelPadding: 8, labelColor: INK.foreground },
      },
    },
    layer: [
      {
        mark: { type: "rect", cornerRadius: 2 },
        encoding: { fill, opacity: { field: "opacity", type: "quantitative", scale: null } },
      },
      {
        mark: { type: "text", fontSize: 12, fontWeight: 500 },
        encoding: {
          text: { field: "text" },
          fill: { field: "ink", type: "nominal", scale: null, legend: null },
        },
      },
    ],
    config: {
      ...SPEC_CONFIG,
      range: { category: [...SERIES] },
      axis: { ...SPEC_CONFIG.axis, grid: false, gridDash: [] },
    },
  };
  const { view, svg } = await render(compile(spec, { logger: quiet }).spec);
  const [, width = "0", height = "0"] = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(svg) ?? [];
  const found = boxes(chart, view, Number(width), Number(height));
  view.finalize();
  return { svg, boxes: found };
}

export async function draw(chart: Chart): Promise<{ svg: string; boxes: Map<number, Box> }> {
  if (chart.type === "heatmap") return heatmap(chart);
  // SAFETY: Flint declares its output `any`; it is a Vega-Lite spec, and compile() checks it at runtime.
  const spec: TopLevelSpec = assembleVegaLite(input(chart));
  spec.background = "transparent";
  // Flint leaves room above for a headline; the figure's caption is the title, so only the axis title and legend
  // need it, and Vega-Lite's autosize makes room for those.
  spec.padding = chart.marks.some((mark) => mark.mark === "circle")
    ? { ...PADDING, bottom: PADDING.bottom + RING_ROOM }
    : PADDING;
  // Every chart over axes is drawn exactly as wide, labels and padding included, so the stylesheet scales them all by
  // the same factor to fill the column, and their text matches from chart to chart. Names at the ends of lines sit
  // past the plot, in room kept on its right.
  if (chart.type !== "pie") {
    const ends = endLabeled(chart)
      ? Math.max(...chart.series.map((name) => guess(name, 12))) + 24
      : 0;
    // A bar's number prints past its end, so the side the bars grow toward keeps room for the widest one.
    const { flip } = layout(chart);
    const past =
      chart.labels && (chart.type === "bar" || chart.type === "stacked")
        ? flip
          ? Math.max(
              ...chart.rows.flatMap((row) =>
                (chart.type === "stacked"
                  ? [sum(row.values, (value) => value > 0), sum(row.values, (value) => value < 0)]
                  : row.values
                ).map((value) => (value ? guess(compact(value, chart.unit), 11) : 0)),
              ),
            ) + 8
          : 20
        : 0;
    spec.padding = {
      ...spec.padding,
      right: PADDING.right + ends + (flip ? past : 0),
      top: PADDING.top + (flip ? 0 : past),
    };
    Reflect.set(spec, "width", WIDTH);
    spec.autosize = { type: "fit-x", contains: "padding" };
  }
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
  const upright =
    waterfall ||
    ((chart.type === "bar" || chart.type === "stacked") && !layout(chart).flip) ||
    ((chart.type === "line" || chart.type === "area") && chart.xKind === "name");
  // A step's words wrap onto up to three lines under it, the third cut short, and its labels turn sideways only when
  // a single word is wider than its step.
  const wrapped = chart.rows.map((row) => clip(wrap(row.x, step - 12), step - 12));
  const flat = wrapped.every((lines) => lines.every((line) => guess(line, 12) <= step - 12));
  const labelExpr = wrapped.reduceRight(
    (rest, lines, index) =>
      lines.length > 1
        ? `datum.label === ${JSON.stringify(chart.rows[index]!.x)} ? ${JSON.stringify(lines)} : ${rest}`
        : rest,
    "datum.label",
  );
  // Flint scales its type with the plot, from 13.5px down to 8px when long labels leave the plot narrow, and ignores
  // the theme's sizes, so text is set to shadcn/ui's 12px here. Labels that don't fit are thinned or cut instead.
  const TYPE = { labelFontSize: 11, titleFontSize: 11 };
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
      // Flint anchors a waterfall's labels at their end, for angled text; flat ones center under their step. Upright bars
      // wrap theirs the same way.
      ...(upright &&
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
      // The numbers' name reads across, over the top of their axis, where a dashboard puts it.
      ...(!layout(chart).flip && {
        titleAngle: 0,
        titleAnchor: "end",
        titleAlign: "left",
        titleBaseline: "bottom",
        titleX: 0,
        titleY: -10,
      }),
      ...(waterfall && { labels: true, grid: true, gridColor: INK.border, gridDash: [2, 3] }),
    },
    // Vega guesses text widths without a font, short for CJK and emoji, so legend entries get room to spare.
    legend: {
      ...spec.config?.legend,
      ...TYPE,
      columns: legendColumns(chart, layout(chart).width),
      columnPadding: 20,
      rowPadding: 12,
      labelLimit: NAME_LIMIT,
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
      (((chart.type === "line" || chart.type === "area") && pinned) || upright) &&
      x &&
      "type" in x &&
      x.type === "temporal"
        ? x
        : undefined;
    if (time) time.scale = { ...("scale" in time && time.scale), padding: 24 };
    // Flint takes the series in the order they first appear, so an empty first cell would move its series, and its
    // color, to the end. A series keeps its column's place and color whatever its cells hold.
    if (color && "field" in color && color.field === "series" && COLUMNS.has(chart.type))
      color.scale = { ...("scale" in color && color.scale), domain: chart.series };
    if (color && "legend" in color && color.legend)
      color.legend = {
        ...color.legend,
        columns: legendColumns(chart, layout(chart).width),
        labelLimit: NAME_LIMIT,
      };
    // Lines named at their ends need no legend to name them again.
    if (color && endLabeled(chart)) unit.encoding.color = { ...color, legend: null };
    // A point on every value shows where the table has a number and where the line only joins two. Flint dots only a
    // line's ends, ringed in the page's color, which on a dark page shrinks them to specks.
    if (chart.type === "line" && "mark" in unit) {
      const mark = unit.mark instanceof Object ? unit.mark : { type: unit.mark };
      if (mark.type === "line")
        unit.mark = {
          ...mark,
          type: "line",
          point:
            chart.rows.length <= MOST_POINTS ? { filled: true, size: 40, strokeWidth: 0 } : false,
        };
      else if (mark.type === "point" && !("opacity" in mark && mark.opacity === 0))
        unit.mark = { ...mark, type: "point", size: 40, strokeWidth: 0 };
    }
    // Bars as thin as a line of text with room between them, so a long list reads row by row. Upright bars stay
    // slim however few there are, as on a dashboard: about 40px, or 22px a bar side by side, with a hair between
    // bars of one group.
    if ((chart.type === "bar" || chart.type === "stacked") && "mark" in unit) {
      const { flip } = layout(chart);
      const band = flip ? y : x;
      const lanes = chart.type === "bar" ? chart.series.length : 1;
      const thin = flip ? 0.35 : slim(chart, lanes > 1 ? lanes * 22 : 40);
      // Bars over dates sit on a time scale, which has no bands: Flint sizes them instead.
      const dated = band && "type" in band && band.type === "temporal";
      if (dated && "mark" in unit && unit.mark instanceof Object && "size" in unit.mark)
        unit.mark = { ...unit.mark, size: Math.min(Number(unit.mark.size), lanes > 1 ? 22 : 40) };
      else if (band && "field" in band && band.field === "x")
        band.scale = {
          ...("scale" in band && band.scale),
          paddingInner: thin,
          paddingOuter: thin / 2,
        };
      const offset = flip ? unit.encoding.yOffset : unit.encoding.xOffset;
      if (offset && "field" in offset)
        offset.scale = { ...("scale" in offset && offset.scale), paddingInner: 0.08 };
    }
    for (const channel of [x, y])
      if (channel && "axis" in channel && channel.axis)
        channel.axis = {
          ...channel.axis,
          labelPadding: 8,
          labelOverlap: "greedy",
          labelSeparation: 6,
          // A crowded waterfall's names hang straight down from their steps: angled, the first would reach under
          // the value axis's 0 in the corner of a plot as wide as the column.
          ...(waterfall &&
            !flat &&
            channel === x && { labelAngle: -90, labelAlign: "right", labelBaseline: "middle" }),
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
    // Numbers on an axis read as they do on the bars: short past a thousand, with their unit. Only the numbers' axis
    // carries the unit, since the x column's header names its own.
    for (const channel of [x, y]) {
      if (!channel || !("field" in channel) || !("type" in channel)) continue;
      if (channel.type !== "quantitative" || ("axis" in channel && channel.axis === null)) continue;
      const numbers = channel.field === "y" || (waterfall && channel === y);
      if (!numbers && channel.field !== "x") continue;
      const axis = "axis" in channel && channel.axis ? channel.axis : {};
      if (!("labelExpr" in axis))
        channel.axis = {
          ...axis,
          labelExpr: compactExpr("datum.value", numbers ? chart.unit : undefined),
        };
      // A log scale spreads numbers across orders of magnitude, its ticks at the powers of ten.
      const logged = chart.log === "both" || (numbers ? chart.log === "y" : chart.log === "x");
      if (logged) {
        const span = numbers
          ? chart.rows.flatMap((row) => row.values.filter((value) => value !== undefined))
          : chart.rows.map((row) => Number(row.x.replaceAll(",", "")));
        const [low, high] = [Math.min(...span), Math.max(...span)];
        // Flint pins a scatter plot's axes at 0, which a log scale has no place for.
        const {
          domainMin: _min,
          domainMax: _max,
          ...scale
        } = "scale" in channel && channel.scale ? channel.scale : {};
        channel.scale = {
          ...scale,
          type: "log",
          nice: false,
          zero: false,
          domain: [low / 1.25, high * 1.25],
        };
        // The ticks are chosen to stand apart, so Vega mustn't thin them further.
        channel.axis = {
          ...channel.axis,
          values: logTicks(low / 1.25, high * 1.25),
          labelOverlap: false,
        };
      }
    }
    // With every bar printing its number, Flint hides the value axis but keeps its title, which then names nothing.
    if (chart.labels && (chart.type === "bar" || chart.type === "stacked"))
      for (const channel of [x, y])
        if (channel && "field" in channel && channel.field === "y") channel.title = null;
    // Vega-Lite rounds a stack as a whole, which costs a clipped group per bar, so bars that stack nothing don't stack.
    // Rows that repeat an `x`, which the plugin reports, still stack rather than hide one behind the other.
    if (chart.type === "bar" && new Set(chart.rows.map((row) => row.x)).size === chart.rows.length)
      for (const channel of [x, y])
        if (channel && "field" in channel && channel.field === "y") channel.stack = null;
    if (waterfall && x && "field" in x && x.field === "x")
      x.scale = {
        ...("scale" in x && x.scale),
        paddingInner: slim(chart, 48, 0.28),
        // The first step's label centers under it, clear of the value axis's 0 in the corner, however thin the steps.
        paddingOuter: flat ? Math.max(0.4, slim(chart, 48, 0.28) / 2 + 0.2) : 1,
      };
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
  let waterfallLabelWidth = 0;
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
    // The last row is a total, as `totals: "both"` tells Flint, whether or not it adds up.
    const finalIsTotal = values.length > 1;
    const widest = Math.max(
      ...chart.rows.map((row, index) => {
        const value = row.values[0] ?? 0;
        const signed =
          index > 0 && !(index === values.length - 1 && finalIsTotal) && value > 0 ? "+" : "";
        return guess(`${signed}${compact(value, chart.unit)}`, 12);
      }),
    );
    const numbers = !!chart.labels && widest + 6 <= step;
    if (numbers) waterfallLabelWidth = widest + 6;
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
        layer.encoding.text = {
          value: {
            expr: `(datum.__wf_color === 'increase' ? '+' : '') + (${compactExpr("datum.y", chart.unit)})`,
          },
        };
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
  // A sideways bar gets a row about twice a line of text tall, and grouped bars a lane each, rather than the share of a
  // fixed height Flint gives them.
  if ((chart.type === "bar" || chart.type === "stacked") && layout(chart).flip) {
    const lanes = chart.type === "bar" ? chart.series.length : 1;
    Reflect.set(spec, "height", { step: lanes > 1 ? lanes * 14 + 12 : 26 });
  }
  // Lines and labels are placed from the drawn chart, so a chart with them is drawn again with them in place.
  const compiled = compile(spec, { logger: quiet }).spec;
  let { view, svg } = await render(compiled);
  if (widen(chart, compiled, view)) {
    view.finalize();
    ({ view, svg } = await render(compiled));
  }
  // The total width only gives an upper bound on a step. Check the final centers after fit-x has reserved the
  // axes and the band scale has applied its inner and outer padding, before keeping any waterfall numbers.
  if (waterfallLabelWidth) {
    const x = view.scale("x");
    const positions: number[] = x
      .domain()
      .map((value: unknown) => Number(x(value)))
      .sort((a: number, b: number) => a - b);
    const spacing = Math.min(
      ...positions.slice(1).map((position, index) => position - positions[index]!),
    );
    if (waterfallLabelWidth > spacing) {
      compiled.marks = compiled.marks?.filter((mark) => mark.type !== "text");
      view.finalize();
      ({ view, svg } = await render(compiled));
    }
  }
  // Waterfalls, dumbbells, and gantts print their own numbers in their layers.
  const labels =
    chart.labels && (chart.type === "bar" || chart.type === "stacked")
      ? valueLabels(chart, view)
      : [];
  const zeros = zeroBars(chart, view);
  const ends = endLabeled(chart) ? endLabels(chart, view) : [];
  if (labels.length || zeros.length || ends.length) {
    compiled.data = [
      ...(compiled.data ?? []),
      ...(zeros.length ? [{ name: "cch_zeros", values: zeros }] : []),
      ...(labels.length ? [{ name: "cch_labels", values: labels }] : []),
      ...(ends.length ? [{ name: "cch_ends", values: ends }] : []),
    ];
    compiled.marks = [
      ...(compiled.marks ?? []),
      ...(zeros.length ? [ZEROS] : []),
      ...(labels.length ? [LABELS] : []),
      ...(ends.length ? END_LABELS : []),
    ];
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
  bar: { cornerRadiusEnd: 2 },
  line: { strokeWidth: 1.5 },
  axis: {
    domain: false,
    ticks: false,
    grid: true,
    gridColor: INK.border,
    gridDash: [2, 3],
    labelColor: INK.muted,
    titleColor: INK.muted,
    labelFontSize: 11,
    titleFontSize: 11,
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
