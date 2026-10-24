import type { RuleInfo } from "./types.ts";

// comark-code's issues, COMARK0601 on.
export default {
  "comark/code/invalid-range": {
    code: "COMARK0601",
    title: "Write line ranges in braces, such as `{2-4}`",
  },
  "comark/code/line-out-of-range": {
    code: "COMARK0602",
    title: "Mark only lines the code block has",
  },
  "comark/code/unknown-frame": {
    code: "COMARK0603",
    title: 'Set `frame` to `"terminal"`, `"code"`, or `"none"`',
  },
  "comark/code/invalid-start-line": {
    code: "COMARK0604",
    title: "Write `startLineNumber` as a whole number",
  },
  "comark/code/listed-before-shiki": {
    code: "COMARK0605",
    title: "List `shiki()` before comark-code",
  },
} satisfies Record<`comark/code/${string}`, RuleInfo>;
