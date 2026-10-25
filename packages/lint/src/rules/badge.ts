import type { RuleInfo } from "./types.ts";

// comark-badge's issues, COMARK1401 on.
export default {
  "comark/badge/invalid-color": {
    code: "COMARK1401",
    title: "Write a badge's `color` as one of Nuxt UI's colors",
  },
  "comark/badge/empty-badge": { code: "COMARK1402", title: "Give every `:badge` text" },
  "comark/badge/unknown-prop": { code: "COMARK1403", title: "Use supported `:badge` props" },
  "comark/badge/invalid-image": { code: "COMARK1404", title: "Give image badges valid options" },
} satisfies Record<`comark/badge/${string}`, RuleInfo>;
