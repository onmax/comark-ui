import type { ComponentInfo } from "../../../shared/component-info.ts";

/** What an editor shows for `::table`. */
export const componentInfo = {
  table: {
    kind: "block",
    label: "Table",
    description:
      "A table read from a CSV, TSV, or JSON file or fence, or a Markdown table, with buttons that copy it.",
    props: {
      src: {
        type: "string",
        description: "A CSV, TSV, or JSON file to read, relative to the document's folder.",
      },
      format: {
        type: "string",
        options: ["csv", "tsv", "json"],
        description: "The format, when the extension or the fence doesn't say.",
      },
      sort: {
        type: "boolean",
        description: "Makes every header a button that sorts the rows.",
      },
      copy: { type: "boolean", default: true, description: "Shows the Copy button and its menu." },
    },
  },
} satisfies Record<string, ComponentInfo>;
