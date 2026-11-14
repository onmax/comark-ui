import type { ComponentInfo } from "../../../shared/component-info.ts";

const sync = {
  type: "string",
  description: "A key shared by blocks that switch to the same tab together.",
} as const;

/** What an editor shows for `::tabs`, `:::tabs-item`, and `::code-group`. */
export const componentInfo = {
  tabs: {
    kind: "block",
    label: "Tabs",
    description:
      "Tabs that show one version of the content at a time. Each tabs item inside is one tab.",
    props: { sync },
  },
  "tabs-item": {
    kind: "block",
    label: "Tab",
    description: "One tab of a tabs block, with any Markdown inside.",
    props: {
      label: {
        type: "string",
        description: "The tab's name, different from the other tabs' names. Required.",
      },
      icon: {
        type: "string",
        description: "An Iconify name, such as lucide:apple, or an image URL, before the label.",
      },
    },
  },
  "code-group": {
    kind: "block",
    label: "Code group",
    description:
      "Code blocks as tabs, each named in brackets after its language, such as sh [pnpm].",
    props: {
      sync,
      magic: {
        type: "boolean",
        description:
          "Animates the code shared between tabs. Without it, only snippets that share half their tokens animate.",
      },
    },
  },
} satisfies Record<string, ComponentInfo>;
