import type { ComponentInfo } from "../../../shared/component-info.ts";

/** What an editor shows for `::zoom`. */
export const componentInfo = {
  zoom: {
    kind: "block",
    label: "Zoom",
    description: "Blocks a reader clicks to see large, as one item in a zoomed view.",
    props: {
      title: { type: "string", description: "The heading of the zoomed view." },
      group: {
        type: "string",
        description: "Items with the same group page through one zoomed view.",
      },
    },
  },
} satisfies Record<string, ComponentInfo>;
