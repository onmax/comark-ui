import type { RuleInfo } from "./types.ts";

// comark-magic-move's issues, COMARK4201 on.
export default {
  "comark/magic-move/single-step": {
    code: "COMARK4201",
    title: "Give every `::magic-move` two code blocks or more",
  },
  "comark/magic-move/content-in-magic-move": {
    code: "COMARK4202",
    title: "Put only code blocks in `::magic-move`",
  },
  "comark/magic-move/unknown-prop": {
    code: "COMARK4203",
    title: "Use only `::magic-move`'s props",
  },
} satisfies Record<`comark/magic-move/${string}`, RuleInfo>;
