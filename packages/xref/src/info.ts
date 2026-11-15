import type { ComponentInfo } from "../../../shared/component-info.ts";

/** What an editor shows for `:ref`. */
export const componentInfo = {
  ref: {
    kind: "inline",
    label: "Cross-reference",
    description: "A link to a labeled figure or table that reads as its number, such as Figure 2.",
    props: {
      id: { type: "string", description: "The fig- or tbl- label the link points at. Required." },
    },
  },
} satisfies Record<string, ComponentInfo>;
