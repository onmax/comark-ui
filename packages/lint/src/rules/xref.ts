import type { RuleInfo } from "./types.ts";

// comark-xref's issues, COMARK2901 on.
export default {
  "comark/xref/duplicate-label": {
    code: "COMARK2901",
    title: "Give each figure and table its own label",
  },
  "comark/xref/inline-figure": {
    code: "COMARK2902",
    title: "Put a labeled image on a line of its own",
  },
  "comark/xref/missing-id": { code: "COMARK2903", title: "Give every `:ref` an id" },
  "comark/xref/unknown-label": {
    code: "COMARK2904",
    title: "Point `:ref` at a label in the document",
  },
  "comark/xref/ref-content": { code: "COMARK2905", title: "Keep text out of `:ref`" },
} satisfies Record<`comark/xref/${string}`, RuleInfo>;
