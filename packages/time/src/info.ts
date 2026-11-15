import type { ComponentInfo } from "../../../shared/component-info.ts";

/** What an editor shows for `:time`. */
export const componentInfo = {
  time: {
    kind: "inline",
    label: "Relative time",
    description:
      "An ISO date in its brackets as relative words, such as 2 days ago, with the full date in a tooltip.",
    props: {
      threshold: {
        type: "string",
        default: "4w",
        description:
          "How far from now it shows a date instead, such as 2w, or none to stay relative.",
      },
    },
  },
} satisfies Record<string, ComponentInfo>;
