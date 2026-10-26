import type { RuleInfo } from "./types.ts";

// comark-charts's issues, COMARK0401 on.
export default {
  "comark/charts/unknown-prop": {
    code: "COMARK0401",
    title: "Use only the props of `::chart` and its annotations",
  },
  "comark/charts/missing-table": {
    code: "COMARK0402",
    title: "Put a Markdown table in every `::chart`",
  },
  "comark/charts/content-dropped": {
    code: "COMARK0403",
    title: "Keep text out of `::chart`",
  },
  "comark/charts/too-few-columns": {
    code: "COMARK0404",
    title: "Give a chart's table an x column and a column of numbers",
  },
  "comark/charts/unnamed-column": {
    code: "COMARK0405",
    title: "Give every column of a chart's table a header",
  },
  "comark/charts/duplicate-column": {
    code: "COMARK0406",
    title: "Give each column of a chart's table its own header",
  },
  "comark/charts/empty-table": { code: "COMARK0407", title: "Give a chart's table rows" },
  "comark/charts/unknown-column": {
    code: "COMARK0408",
    title: "Name only the table's columns in `x` and `y`",
  },
  "comark/charts/x-in-y": { code: "COMARK0409", title: "Keep the `x` column out of `y`" },
  "comark/charts/missing-x": { code: "COMARK0410", title: "Fill in every row's x value" },
  "comark/charts/non-numeric-value": {
    code: "COMARK0411",
    title: "Write chart values as plain numbers",
  },
  "comark/charts/duplicate-x": { code: "COMARK0412", title: "Give each row its own x value" },
  "comark/charts/unknown-type": {
    code: "COMARK0413",
    title: "Use a `type` comark-charts draws",
  },
  "comark/charts/non-numeric-x": {
    code: "COMARK0414",
    title: "Put numbers on the x of a scatter plot",
  },
  "comark/charts/too-few-series": {
    code: "COMARK0415",
    title: "Give a dumbbell two or more columns of numbers",
  },
  "comark/charts/too-few-rows": {
    code: "COMARK0416",
    title: "Give a line or an area two or more rows",
  },
  "comark/charts/too-many-series": {
    code: "COMARK0417",
    title: "Draw one column in a pie or a waterfall",
  },
  "comark/charts/invalid-pie-values": {
    code: "COMARK0418",
    title: "Give a pie a total to divide, with no negative numbers",
  },
  "comark/charts/invalid-at": {
    code: "COMARK0419",
    title: "Point every chart annotation at a row with `at`",
  },
  "comark/charts/unknown-series": {
    code: "COMARK0420",
    title: "Name a column the chart draws in `series`",
  },
  "comark/charts/marks-empty-cell": {
    code: "COMARK0421",
    title: "Mark a cell that holds a number",
  },
  "comark/charts/spec-with-props": {
    code: "COMARK0422",
    title: "Leave `type`, `x`, and `y` off a chart drawn from a Vega-Lite spec",
  },
  "comark/charts/spec-with-annotations": {
    code: "COMARK0423",
    title: "Draw notes on a Vega-Lite chart as layers of its spec",
  },
  "comark/charts/invalid-spec-json": {
    code: "COMARK0424",
    title: "Write a Vega-Lite spec as one JSON object",
  },
  "comark/charts/spec-with-data": {
    code: "COMARK0425",
    title: "Leave `data` out of a Vega-Lite spec",
  },
  "comark/charts/unknown-spec-field": {
    code: "COMARK0426",
    title: "Use the table's headers as a spec's fields",
  },
  "comark/charts/draw-failed": {
    code: "COMARK0427",
    title: "Write a Vega-Lite spec that Vega-Lite can draw",
  },
  "comark/charts/start-and-end": {
    code: "COMARK0428",
    title: "Give every row of a gantt a start and an end",
  },
  "comark/charts/end-before-start": {
    code: "COMARK0429",
    title: "End every bar of a gantt after it starts",
  },
  "comark/charts/too-many-groups": {
    code: "COMARK0430",
    title: "Color a gantt by one column of names",
  },
  "comark/charts/invalid-labels": {
    code: "COMARK0431",
    title: "Put `labels` on a chart with bars, steps, or dots",
  },
  "comark/charts/invalid-line": {
    code: "COMARK0432",
    title: "Cross a chart with a line at a number on its value axis",
  },
  "comark/charts/invalid-horizontal": {
    code: "COMARK0433",
    title: "Put `horizontal` on bar and stacked bar charts",
  },
  "comark/charts/waterfall-total": {
    code: "COMARK0434",
    title: "End a waterfall with its start plus every change",
  },
} satisfies Record<`comark/charts/${string}`, RuleInfo>;
