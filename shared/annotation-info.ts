import type { ComponentInfo } from "./component-info.ts";

export const annotationInfo = {
  annotation: {
    kind: "block",
    label: "Annotation",
    description:
      "A mark and its note, on a screenshot's area in percentages of the image, or on a chart's row.",
    props: {
      x: { type: "number", description: "On a screenshot, the left edge, from 0 to 100." },
      y: { type: "number", description: "The top edge, from 0 to 100." },
      w: { type: "number", description: "The width, above 0 and up to 100." },
      h: { type: "number", description: "The height, above 0 and up to 100." },
      mark: {
        type: "string",
        options: [
          "box",
          "circle",
          "underline",
          "line",
          "highlight",
          "bracket",
          "cross",
          "check",
          "none",
        ],
        default: "box",
      },
      color: {
        type: "string",
        description:
          "violet, red, amber, green, blue, gray, or a hex color. Without it, the screenshot's ink.",
      },
      side: {
        type: "string",
        options: ["left", "right", "top", "bottom"],
        description: "Puts the note beside, above, or below the image with an arrow.",
      },
      at: {
        type: "string",
        description:
          "On a chart, the row's x value. On a screenshot, where a side note sits, as a percentage.",
      },
      series: { type: "string", description: "On a chart, the column to mark in the row." },
      value: {
        type: "string",
        description: "On a chart, where a line mark crosses the value axis.",
      },
      to: { type: "string", description: "The point the arrow lands on, such as 42,18." },
    },
  },
} satisfies Record<string, ComponentInfo>;
