import type { ComponentInfo } from "../../../shared/component-info.ts";

/** What an editor shows for `::properties`. */
export const componentInfo = {
  properties: {
    kind: "block",
    label: "Properties",
    description:
      "A box of the document's frontmatter, such as its status, author, and date, placed where it sits.",
  },
} satisfies Record<string, ComponentInfo>;
