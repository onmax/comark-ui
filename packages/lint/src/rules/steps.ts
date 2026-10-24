import type { RuleInfo } from "./types.ts";

// comark-steps's issues, COMARK1201 on.
export default {
  "comark/steps/invalid-level": { code: "COMARK1201", title: "Set `level` from 2 to 6" },
  "comark/steps/content-before-steps": {
    code: "COMARK1202",
    title: "Start `::steps` with its first step's heading",
  },
  "comark/steps/no-steps": {
    code: "COMARK1203",
    title: "Start each step with a heading at `level`, or use one numbered list",
  },
  "comark/steps/unknown-prop": { code: "COMARK1204", title: "Use only `::steps`'s `level` prop" },
} satisfies Record<`comark/steps/${string}`, RuleInfo>;
