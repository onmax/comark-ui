import type { RuleInfo } from "./types.ts";

// comark-fields' issues, COMARK3101 on.
export default {
  "comark/fields/missing-name": { code: "COMARK3101", title: "Give every `::field` a `name`" },
  "comark/fields/unknown-prop": { code: "COMARK3102", title: "Use only `::field`'s props" },
  "comark/fields/description-ignored": {
    code: "COMARK3103",
    title: "Write a field's description once",
  },
} satisfies Record<`comark/fields/${string}`, RuleInfo>;
