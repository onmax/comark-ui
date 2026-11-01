import type { RuleInfo } from "./types.ts";

// comark-diagrams' issues, COMARK1501 on.
export default {
  "comark/diagrams/draw-failed": {
    code: "COMARK1501",
    title: "Write a diagram's source so Kroki can draw it",
  },
  "comark/diagrams/server-unreachable": {
    code: "COMARK1502",
    title: "Reach the Kroki server while building",
  },
  "comark/diagrams/authored-svg": {
    code: "COMARK1503",
    title: "Draw a diagram from a fence, not `svg`",
  },
} satisfies Record<`comark/diagrams/${string}`, RuleInfo>;
