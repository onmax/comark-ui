import type { RuleInfo } from "./types.ts";

// comark-quiz's issues, COMARK4001 on.
export default {
  "comark/quiz/no-options": {
    code: "COMARK4001",
    title: "Write a question's or poll's options as a task list",
    severity: "error",
  },
  "comark/quiz/no-correct-option": {
    code: "COMARK4002",
    title: "Mark a question's right option `[x]`",
    severity: "error",
  },
  "comark/quiz/correct-in-poll": {
    code: "COMARK4003",
    title: "Leave every poll option unchecked",
    severity: "error",
  },
  "comark/quiz/missing-answer": {
    code: "COMARK4004",
    title: "Give every `::recall` an `#answer`",
    severity: "error",
  },
  "comark/quiz/missing-id": { code: "COMARK4005", title: "Give every quiz block an `#id`" },
  "comark/quiz/duplicate-id": {
    code: "COMARK4006",
    title: "Give each quiz block its own `#id`",
    severity: "error",
  },
  "comark/quiz/longest-correct": {
    code: "COMARK4007",
    title: "Keep the right option about as long as the others",
  },
  "comark/quiz/position-option": {
    code: "COMARK4008",
    title: "Write out an option instead of pointing at others by place",
  },
  "comark/quiz/missing-rationale": {
    code: "COMARK4009",
    title: "Say why each wrong option is wrong in a `>` line",
  },
  "comark/quiz/line-break-option": {
    code: "COMARK4010",
    title: "Start an option's rationale with `>`",
  },
  "comark/quiz/swallowed-slot": {
    code: "COMARK4011",
    title: "Leave a blank line before `#explain`, `#hint`, and `#answer`",
    severity: "error",
  },
  "comark/quiz/too-many-options": { code: "COMARK4012", title: "Keep a block to six options" },
  "comark/quiz/unknown-prop": {
    code: "COMARK4013",
    title: "Use only the props of `::question`, `::poll`, and `::recall`",
  },
  "comark/quiz/unknown-slot": {
    code: "COMARK4014",
    title: "Use only the slots of `::question` and `::recall`",
  },
  "comark/quiz/invalid-closes": {
    code: "COMARK4015",
    title: "Write a poll's `closes` as an ISO date",
  },
  "comark/quiz/nested-block": {
    code: "COMARK4016",
    title: "Keep quiz blocks out of each other",
  },
} satisfies Record<`comark/quiz/${string}`, RuleInfo>;
