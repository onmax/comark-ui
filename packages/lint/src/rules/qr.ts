import type { RuleInfo } from "./types.ts";

// comark-qr's issues, COMARK3301 on.
export default {
  "comark/qr/missing-value": { code: "COMARK3301", title: "Give every `:qr` a `value`" },
  "comark/qr/value-too-long": {
    code: "COMARK3302",
    title: "Keep a `:qr` value short enough to encode",
  },
  "comark/qr/content-dropped": { code: "COMARK3303", title: "Keep text out of `:qr`'s brackets" },
  "comark/qr/unknown-prop": { code: "COMARK3304", title: "Use only `:qr`'s props" },
} satisfies Record<`comark/qr/${string}`, RuleInfo>;
