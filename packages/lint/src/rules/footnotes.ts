import type { RuleInfo } from "./types.ts";

// comark-footnotes' issues, COMARK2301 on.
export default {
  "comark/footnotes/missing-definition": {
    code: "COMARK2301",
    title: "Define every footnote you reference",
  },
  "comark/footnotes/unused-definition": {
    code: "COMARK2302",
    title: "Reference every footnote you define",
  },
  "comark/footnotes/duplicate-definition": {
    code: "COMARK2303",
    title: "Define each footnote label once",
  },
} satisfies Record<`comark/footnotes/${string}`, RuleInfo>;
