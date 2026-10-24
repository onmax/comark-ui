import type { RuleInfo } from "./types.ts";

// comark-diff's issues, COMARK0701 on.
export default {
  "comark/diff/unknown-prop": { code: "COMARK0701", title: "Use only `::diff`'s props" },
  "comark/diff/undefined-binding": {
    code: "COMARK0702",
    title: "Bind `::diff` props to data that exists",
  },
  "comark/diff/stray-content": {
    code: "COMARK0703",
    title: "Put only the two code blocks inside a `::diff`",
  },
  "comark/diff/block-count": {
    code: "COMARK0704",
    title: "Give every `::diff` two code blocks, before and after",
  },
  "comark/diff/unified-diff": {
    code: "COMARK0705",
    title: "Write a `::diff` as before and after, not as a unified diff",
  },
  "comark/diff/missing-file": { code: "COMARK0706", title: "Name the file a `::diff` changes" },
  "comark/diff/file-mismatch": { code: "COMARK0707", title: "Show one file in each `::diff`" },
  "comark/diff/language-mismatch": {
    code: "COMARK0708",
    title: "Give both blocks of a `::diff` the same language",
  },
  "comark/diff/invalid-line": {
    code: "COMARK0709",
    title: "Write `line` as a whole number from 1",
  },
  "comark/diff/too-many-lines": {
    code: "COMARK0710",
    title: "Keep each block of a `::diff` to 200 lines",
  },
  "comark/diff/no-change": {
    code: "COMARK0711",
    title: "Change something between before and after",
  },
} satisfies Record<`comark/diff/${string}`, RuleInfo>;
