import type { ComponentInfo } from "../../../shared/component-info.ts";

const better = {
  type: "string",
  options: ["lower", "higher"],
  description:
    "Which way is better: lower for sizes and durations, higher for scores. Without it, the change is gray.",
} as const;

/** What an editor shows for `:delta`, `::stats`, and `:progress`. */
export const componentInfo = {
  delta: {
    kind: "inline",
    label: "Delta",
    description:
      "A number before and after, with an arrow, the percent change, and whether it got better.",
    props: {
      from: { type: "number", description: "The number before. Required." },
      to: { type: "number", description: "The number after. Required." },
      unit: { type: "string", description: "Written after both numbers, such as kB, s, or %." },
      better,
    },
  },
  stats: {
    kind: "block",
    label: "Stats",
    description:
      "A table of names, values before, and values after, with a Change column, or the same as tiles.",
    props: {
      better,
      unit: {
        type: "string",
        description: "The unit of a change from 0, for cells written without one.",
      },
      tiles: { type: "boolean", description: "Shows each row as a tile." },
    },
  },
  progress: {
    kind: "inline",
    label: "Progress",
    description: "A progress bar with its percent after it.",
    props: {
      value: {
        type: "number",
        description: "A fraction from 0 to 1, or a count up to max. Required.",
      },
      max: { type: "number", default: 1, description: "What value counts up to." },
      label: {
        type: "string",
        description: "Shown before the bar, and names it for screen readers.",
      },
    },
  },
} satisfies Record<string, ComponentInfo>;
