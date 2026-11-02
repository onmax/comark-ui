import type { RuleInfo } from "./types.ts";

// comark-ui's Shiki limits, COMARK4501 on.
export default {
  "comark/shiki/too-many-blocks": {
    code: "COMARK4501",
    title: "Keep highlighted code blocks within the document's count limit",
  },
  "comark/shiki/source-too-long": {
    code: "COMARK4502",
    title: "Keep highlighted code within the document's character limit",
  },
} satisfies Record<`comark/shiki/${string}`, RuleInfo>;
