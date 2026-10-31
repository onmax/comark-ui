import type { RuleInfo } from "./types.ts";

// comark-properties' issues, COMARK2801 on.
export default {
  "comark/properties/invalid-value": {
    code: "COMARK2801",
    title: "Write each shown key as text, a number, a link, or a list of them",
  },
  "comark/properties/content-dropped": {
    code: "COMARK2802",
    title: "Keep content out of `::properties`",
  },
  "comark/properties/nothing-to-show": {
    code: "COMARK2803",
    title: "Give `::properties` a key to show",
  },
  "comark/properties/unknown-prop": {
    code: "COMARK2804",
    title: "Write `::properties` without props",
  },
  "comark/properties/invalid-locale": {
    code: "COMARK2805",
    title: "Choose a valid locale for properties dates",
  },
} satisfies Record<`comark/properties/${string}`, RuleInfo>;
