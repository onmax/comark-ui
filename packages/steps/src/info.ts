import type { ComponentInfo } from "../../../shared/component-info.ts";

/** What an editor shows for `::steps`. */
export const componentInfo = {
  steps: {
    kind: "block",
    label: "Steps",
    description:
      "Numbered steps joined by a line, one per heading inside or per item of one numbered list.",
    props: {
      level: {
        type: "number",
        default: 3,
        description: "The level of the headings that start each step, from 2 to 6.",
      },
    },
  },
} satisfies Record<string, ComponentInfo>;
