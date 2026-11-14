import type { ComponentInfo } from "../../../shared/component-info.ts";

const icon = {
  type: "string",
  description: "An icon before the summary, such as lucide:info.",
} as const;

/** What an editor shows for `::details`, `::accordion`, `:::accordion-item`, and `::collapsible`. */
export const componentInfo = {
  details: {
    kind: "block",
    label: "Details",
    description: "A summary that opens to show the content it hides.",
    props: {
      summary: {
        type: "string",
        default: "Details",
        description: "The text shown while it's closed.",
      },
      open: { type: "boolean", description: "Starts it open." },
      icon,
    },
    slots: { summary: "The summary, in Markdown. It wins over the summary prop." },
  },
  accordion: {
    kind: "block",
    label: "Accordion",
    description: "A run of items that each open to show their content.",
    props: {
      type: {
        type: "string",
        options: ["multiple", "single"],
        default: "multiple",
        description: "single closes the other items when one opens.",
      },
      defaultValue: {
        type: "json",
        description: 'The items that start open, by position from 0, such as ["0", "2"].',
      },
    },
  },
  "accordion-item": {
    kind: "block",
    label: "Accordion item",
    description: "One item of an accordion, with its label as the summary.",
    props: {
      label: { type: "string", description: "The summary. Required." },
      icon: { type: "string", description: "An icon before the label, such as lucide:info." },
      description: {
        type: "string",
        description: "The text shown when the item has no content of its own.",
      },
    },
  },
  collapsible: {
    kind: "block",
    label: "Collapsible",
    description:
      "A quiet line of text, such as Show properties, that opens to show optional content.",
    props: {
      name: {
        type: "string",
        default: "properties",
        description: "What it hides, after the open or close text.",
      },
      openText: {
        type: "string",
        default: "Show",
        description: "The word before the name while it's closed.",
      },
      closeText: {
        type: "string",
        default: "Hide",
        description: "The word before the name while it's open.",
      },
      icon,
    },
  },
} satisfies Record<string, ComponentInfo>;
