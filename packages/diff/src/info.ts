import type { ComponentInfo } from "../../../shared/component-info.ts";

/** What an editor shows for `::diff`. */
export const componentInfo = {
  diff: {
    kind: "block",
    label: "Code change",
    description: "A file's lines before and after a change, from the two code blocks inside it.",
    props: {
      file: {
        type: "string",
        description: "The file's path. Without it, the name on the first code block.",
      },
      line: {
        type: "number",
        description:
          "The file's line number where both blocks start. Without it, the lines aren't numbered.",
      },
      label: {
        type: "string",
        description: "A heading before the file name, such as Suggested change.",
      },
    },
  },
} satisfies Record<string, ComponentInfo>;
