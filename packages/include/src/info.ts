import type { ComponentInfo } from "../../../shared/component-info.ts";

/** What an editor shows for `:include`. */
export const componentInfo = {
  include: {
    kind: "inline",
    label: "Include",
    description:
      "A Markdown file, or lines of another file as code, pasted in place. It stands alone on its line.",
    props: {
      src: {
        type: "string",
        description:
          "The file, relative to the page's folder, or to root with a leading /. Required.",
      },
      lines: {
        type: "string",
        description: "The lines to keep, 1-based and inclusive, such as 10:24, 10:, or :24.",
      },
      region: {
        type: "string",
        description: "Keeps the lines between #region name and #endregion name. Not with lines.",
      },
      code: {
        type: "boolean",
        description: "Shows a Markdown file as a code block instead of pasting it.",
      },
      lang: {
        type: "string",
        description: "The code block's language instead of the extension's.",
      },
    },
  },
} satisfies Record<string, ComponentInfo>;
