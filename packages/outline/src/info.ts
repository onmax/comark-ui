import type { ComponentInfo } from "../../../shared/component-info.ts";

/** What an editor shows for `::toc`. */
export const componentInfo = {
  toc: {
    kind: "block",
    label: "Table of contents",
    description: "A nested list of links to the page's headings.",
    props: {
      depth: {
        type: "number",
        default: 3,
        description: "The deepest heading it lists, from 2 to 6.",
      },
      title: {
        type: "string",
        description: "A small title above the list, and the name screen readers read.",
      },
    },
  },
} satisfies Record<string, ComponentInfo>;
