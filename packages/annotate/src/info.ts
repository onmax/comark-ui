import { annotationInfo } from "../../../shared/annotation-info.ts";
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
  ...annotationInfo,
} satisfies Record<string, ComponentInfo>;
