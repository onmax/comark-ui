import type { ComponentInfo } from "../../../shared/component-info.ts";

const ink = {
  type: "string",
  description:
    "The color of marks and notes that set none: red, amber, green, blue, violet, gray, or a hex color.",
} as const;
const id = {
  type: "string",
  description: "An id, such as fig-login, for links and comark-xref references.",
} as const;

/** What an editor shows for `::screenshot`, `::compare`, and `:::annotation`. */
export const componentInfo = {
  screenshot: {
    kind: "block",
    label: "Screenshot",
    description:
      "A screenshot with numbered marks, and the notes that explain them. Other content is its caption.",
    props: {
      src: { type: "string", description: "The image's URL. Required." },
      alt: { type: "string", description: "What the screenshot shows. Required." },
      title: { type: "string", description: "The heading above the image." },
      href: {
        type: "string",
        description: "The page you captured, linked by its host next to the title.",
      },
      viewport: { type: "string", description: "The capture size in pixels, such as 1440x900." },
      ink,
      id,
    },
  },
  compare: {
    kind: "block",
    label: "Before/after",
    description: "Two screenshots side by side, or one over the other with a divider to drag.",
    props: {
      title: { type: "string", default: "Comparison", description: "What the comparison shows." },
      mode: { type: "string", options: ["columns", "slider"], default: "columns" },
      ink,
      id,
    },
  },
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
        type: "number",
        description: "On a chart, where a line mark crosses the value axis.",
      },
      to: { type: "string", description: "The point the arrow lands on, such as 42,18." },
    },
  },
} satisfies Record<string, ComponentInfo>;
