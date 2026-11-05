import type { RuleInfo } from "./types.ts";

// comark-time's issues, COMARK4601 on.
export default {
  "comark/time/missing-date": {
    code: "COMARK4601",
    title: "Put a date in brackets after `:time`",
  },
  "comark/time/invalid-date": {
    code: "COMARK4602",
    title: "Write a `:time` date as `2026-10-12` or `2026-10-12T14:03:00Z`",
  },
  "comark/time/invalid-threshold": {
    code: "COMARK4603",
    title: "Write `threshold` as a number and a unit, or `none`",
  },
  "comark/time/unknown-prop": {
    code: "COMARK4604",
    title: "Use only the `threshold` prop of `:time`",
  },
} satisfies Record<`comark/time/${string}`, RuleInfo>;
