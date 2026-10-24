import type { RuleInfo } from "./types.ts";

// comark-cards's issues, COMARK0201 on. Its icons' problems are comark-icon's rules.
export default {
  "comark/cards/invalid-color": {
    code: "COMARK0201",
    title: "Write a card's `color` as one of Nuxt UI's colors",
  },
  "comark/cards/href-instead-of-to": {
    code: "COMARK0202",
    title: "Link a card with `to`, not `href`",
  },
  "comark/cards/unsafe-link": {
    code: "COMARK0203",
    title: "Keep script URLs out of a card's `to`",
    severity: "error",
  },
  "comark/cards/invalid-cols": {
    code: "COMARK0204",
    title: "Write `cols` as a number from 1 to 6",
  },
  "comark/cards/empty-columns": { code: "COMARK0205", title: "Put a block in every `::columns`" },
  "comark/cards/unknown-prop": {
    code: "COMARK0206",
    title: "Use only the props of `::card` and `::columns`",
  },
  "comark/cards/invalid-variant": {
    code: "COMARK0207",
    title: "Write a card's `variant` as `outline`, `soft`, or `subtle`",
  },
} satisfies Record<`comark/cards/${string}`, RuleInfo>;
