import type { ComponentInfo } from "../../../shared/component-info.ts";

/** What an editor shows for `:cite` and `::sources`. */
export const componentInfo = {
  cite: {
    kind: "inline",
    label: "Citation",
    description: "A numbered link to the sources its brackets name, such as 1 or 1,3.",
  },
  sources: {
    kind: "block",
    label: "Sources",
    description:
      "The numbered list of links that citations point at, each linking back to its citations.",
    props: {
      title: { type: "string", default: "Sources", description: "The title above the list." },
    },
  },
} satisfies Record<string, ComponentInfo>;
