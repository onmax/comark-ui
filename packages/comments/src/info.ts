import type { ComponentInfo } from "../../../shared/component-info.ts";

const by = { type: "string", description: "The author, shown without a leading @." } as const;
const id = { type: "string", description: "The id a reply points at." } as const;

/** What an editor shows for `:suggestion` and `:comment`. */
export const componentInfo = {
  suggestion: {
    kind: "inline",
    label: "Suggestion",
    description:
      "A suggested edit to the text, struck and inserted, with its note in a card in the margin.",
    props: {
      from: {
        type: "string",
        description: "The text it replaces or deletes. Without it, an insertion.",
      },
      by,
      note: {
        type: "string",
        description: "Why, in plain text. Without it and without replies there is no card.",
      },
      mark: {
        type: "string",
        options: ["track", "pen"],
        default: "track",
        description: "pen draws a handwritten edit.",
      },
      id,
    },
  },
  comment: {
    kind: "inline",
    label: "Comment",
    description:
      "A comment on the words in its brackets, in a card in the margin, or a reply to a thread.",
    props: {
      by,
      note: { type: "string", description: "The comment, in plain text." },
      id,
      reply: {
        type: "string",
        description:
          "The id of the comment or suggestion this one answers, which makes it a reply.",
      },
    },
  },
} satisfies Record<string, ComponentInfo>;
