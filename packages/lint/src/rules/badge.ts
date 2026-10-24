import type { RuleInfo } from "./types.ts";

// comark-badge's issues, COMARK1401 on.
export default {
  "comark/badge/invalid-color": {
    code: "COMARK1401",
    title: "Write a badge's `color` as one of Nuxt UI's colors",
  },
  "comark/badge/empty-badge": { code: "COMARK1402", title: "Give every `:badge` text" },
  "comark/badge/unknown-prop": { code: "COMARK1403", title: "Use only `:badge`'s `color` prop" },
} satisfies Record<`comark/badge/${string}`, RuleInfo>;
