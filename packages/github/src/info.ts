import type { ComponentInfo } from "../../../shared/component-info.ts";

const title = {
  type: "string",
  description: "Replaces the title, which is the type by default.",
} as const;
const slots = { title: "The title, in Markdown. It wins over the title prop." };

/** What an editor shows for `::note`, `::tip`, `::important`, `::warning`, `::caution`, and `::callout`. */
export const componentInfo = {
  note: {
    kind: "block",
    label: "Note",
    description: "A callout for context the reader should know, even when skimming.",
    props: { title },
    slots,
  },
  tip: {
    kind: "block",
    label: "Tip",
    description: "A callout for a better or faster way to do something.",
    props: { title },
    slots,
  },
  important: {
    kind: "block",
    label: "Important",
    description: "A callout for something the reader needs to succeed.",
    props: { title },
    slots,
  },
  warning: {
    kind: "block",
    label: "Warning",
    description: "A callout for a risk that needs the reader's attention now.",
    props: { title },
    slots,
  },
  caution: {
    kind: "block",
    label: "Caution",
    description: "A callout for an action with consequences the reader can't undo.",
    props: { title },
    slots,
  },
  callout: {
    kind: "block",
    label: "Callout",
    description: "A GitHub callout of the type its type prop names.",
    props: {
      type: {
        type: "string",
        options: ["note", "tip", "important", "warning", "caution"],
        default: "note",
      },
      title,
    },
    slots,
  },
} satisfies Record<string, ComponentInfo>;
