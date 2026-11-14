import type { ComponentInfo } from "../../../shared/component-info.ts";

/** What an editor shows for `::card`, `::card-group`, `::columns`, and `:::column`. */
export const componentInfo = {
  card: {
    kind: "block",
    label: "Card",
    description:
      "A bordered card with an optional icon and title, which links to a page when it has a to.",
    props: {
      title: { type: "string", description: "The card's title, which also names its link." },
      description: {
        type: "string",
        description: "The text shown when the card has no content of its own.",
      },
      icon: { type: "string", description: "An icon above the title, such as lucide:rocket." },
      to: { type: "string", description: "A page or a web address, which makes it a link card." },
      target: {
        type: "string",
        description: "Where the link opens. A web address opens in a new tab.",
      },
      color: {
        type: "string",
        options: ["primary", "secondary", "success", "info", "warning", "error", "neutral"],
        default: "primary",
        description: "Tints the icon and a hovered link card's border.",
      },
      variant: { type: "string", options: ["outline", "soft", "subtle"], default: "outline" },
    },
    slots: { title: "The card's title, in Markdown. It wins over the title prop." },
  },
  "card-group": {
    kind: "block",
    label: "Card group",
    description: "Cards in two columns, or one on a narrow page.",
  },
  columns: {
    kind: "block",
    label: "Columns",
    description:
      "Blocks side by side, one cell per block or column inside, stacked on a narrow page.",
    props: { cols: { type: "number", default: 2, description: "How many columns, from 1 to 6." } },
  },
  column: {
    kind: "block",
    label: "Column",
    description: "One cell of columns that holds several blocks.",
  },
} satisfies Record<string, ComponentInfo>;
