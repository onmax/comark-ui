import type { ComponentInfo } from "../../../shared/component-info.ts";

/** What an editor shows for `::magic-move`. */
export const componentInfo = {
  "magic-move": {
    kind: "block",
    label: "Magic move",
    description: "Code that animates from one step to the next, one tab per code block inside it.",
    props: { title: { type: "string", description: "The name screen readers read for the tabs." } },
  },
} satisfies Record<string, ComponentInfo>;
