import type { RuleInfo } from "./types.ts";

// comark-colors' issues, COMARK3801 on.
export default {
  "comark/colors/missing-list": {
    code: "COMARK3801",
    title: "Give every `::palette` a list of `name: color` lines",
  },
  "comark/colors/content-dropped": {
    code: "COMARK3802",
    title: "Keep everything but the list out of `::palette`",
  },
  "comark/colors/unreadable-line": {
    code: "COMARK3803",
    title: "Write each palette line as `name: color`",
  },
  "comark/colors/invalid-color": {
    code: "COMARK3804",
    title: "Write palette colors in a form it can draw",
  },
  "comark/colors/unknown-prop": { code: "COMARK3805", title: "Give `::palette` no props" },
} satisfies Record<`comark/colors/${string}`, RuleInfo>;
