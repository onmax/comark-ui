import type { ComponentInfo } from "../../../shared/component-info.ts";

const id = {
  type: "string",
  description: "The id a host saves answers by, such as event-loop-order.",
} as const;
const number = {
  type: "boolean",
  default: true,
  description: "false leaves the block out of the count.",
} as const;

/** What an editor shows for `::question`, `::poll`, and `::recall`. */
export const componentInfo = {
  question: {
    kind: "block",
    label: "Question",
    description:
      "A prompt and a task list of options, [x] for right ones, that checks the reader's answer.",
    props: {
      id,
      multiple: { type: "boolean", description: "Shows checkboxes, even with one right option." },
      number,
      shuffle: {
        type: "boolean",
        default: true,
        description: "false keeps the options in the order written.",
      },
    },
    slots: {
      hint: "A hint, behind a Hint button.",
      explain: "The explanation, shown after a right answer.",
    },
  },
  poll: {
    kind: "block",
    label: "Poll",
    description: "A prompt and a task list of options that collects votes and shows the results.",
    props: {
      id,
      multiple: { type: "boolean", description: "Shows checkboxes." },
      closes: { type: "string", description: "An ISO date, after which the poll shows as closed." },
    },
  },
  recall: {
    kind: "block",
    label: "Recall card",
    description: "A prompt with an answer hidden until the reader asks for it.",
    props: { id, number },
    slots: { answer: "The answer, blurred until the reader shows it. Required." },
  },
} satisfies Record<string, ComponentInfo>;
