import type { ComponentInfo } from "../../../shared/component-info.ts";

/** What an editor shows for `::palette`. */
export const componentInfo = {
  palette: {
    kind: "block",
    label: "Palette",
    description:
      "A list of name: color lines as a grid of color tiles with their names and values.",
  },
} satisfies Record<string, ComponentInfo>;
