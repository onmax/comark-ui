import type { ComponentInfo } from "../../../shared/component-info.ts";

/** What an editor shows for `::file-tree`. */
export const componentInfo = {
  "file-tree": {
    kind: "block",
    label: "File tree",
    description:
      "Folders and files from a fenced block, one entry per line, with changes and notes marked.",
  },
} satisfies Record<string, ComponentInfo>;
