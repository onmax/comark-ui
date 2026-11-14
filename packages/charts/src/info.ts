import type { ComponentInfo } from "../../../shared/component-info.ts";

/** What an editor shows for `::chart`. */
export const componentInfo = {
  chart: {
    kind: "block",
    label: "Chart",
    description: "A chart drawn from the Markdown table inside it, with the table kept under it.",
    props: {
      type: {
        type: "string",
        options: [
          "bar",
          "stacked",
          "line",
          "area",
          "scatter",
          "dumbbell",
          "waterfall",
          "pie",
          "heatmap",
          "gantt",
          "sankey",
        ],
        default: "bar",
      },
      x: {
        type: "string",
        description: "The column along the x axis. Without it, the first column.",
      },
      y: {
        type: "string",
        description: "The columns to draw, separated by commas. Without it, every column but x.",
      },
      title: {
        type: "string",
        description: "The chart's caption, and its name for screen readers.",
      },
      description: {
        type: "string",
        description: "What to read in the chart, in a line under its title.",
      },
      unit: {
        type: "string",
        description: "The numbers' unit: $ prints before them, % or ms after.",
      },
      log: {
        type: "string",
        description: "A log scale: alone for the numbers' axis, x for the x axis, or both.",
      },
      better: {
        type: "string",
        options: ["higher", "lower"],
        description: "Colors a heatmap's cells from red to green.",
      },
      labels: {
        type: "boolean",
        description:
          "Prints the numbers on the chart. On by default for bars, stacked bars, and heatmaps.",
      },
      horizontal: { type: "boolean", description: "Turns bar and stacked bars sideways." },
    },
  },
} satisfies Record<string, ComponentInfo>;
