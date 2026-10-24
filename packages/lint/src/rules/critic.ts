import type { RuleInfo } from "./types.ts";

// comark-critic's issues, COMARK1701 on.
export default {
  "comark/critic/unclosed-mark": {
    code: "COMARK1701",
    title: "Close every CriticMarkup mark in its paragraph",
  },
  "comark/critic/missing-arrow": {
    code: "COMARK1702",
    title: "Write `~>` between the old and new text of `{~~ ~~}`",
  },
  "comark/critic/invalid-mode": {
    code: "COMARK1703",
    title: "Set comark-critic's `mode` to `view`, `accept`, or `reject`",
  },
} satisfies Record<`comark/critic/${string}`, RuleInfo>;
