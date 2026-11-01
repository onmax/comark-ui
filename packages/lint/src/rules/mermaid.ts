import type { RuleInfo } from "./types.ts";

// comark-ui's Mermaid limits, COMARK4401 on.
export default {
  "comark/mermaid/too-many-diagrams": {
    code: "COMARK4401",
    title: "Keep Mermaid diagrams within the document's count limit",
  },
  "comark/mermaid/source-too-long": {
    code: "COMARK4402",
    title: "Keep Mermaid source within the document's character limit",
  },
} satisfies Record<`comark/mermaid/${string}`, RuleInfo>;
