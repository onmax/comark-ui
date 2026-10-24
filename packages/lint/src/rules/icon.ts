import type { RuleInfo } from "./types.ts";

// comark-icon's issues, COMARK1001 on. comark-tabs, comark-cards, and comark-code report their icons' problems under
// these rules too, through `iconProblemRule()`.
export default {
  "comark/icon/missing-name": { code: "COMARK1001", title: "Give every `:icon` a `name`" },
  "comark/icon/invalid-name": { code: "COMARK1002", title: "Write icon names as `set:name`" },
  "comark/icon/unknown-set": { code: "COMARK1003", title: "Draw icons from a set that exists" },
  "comark/icon/unknown-icon": { code: "COMARK1004", title: "Use an icon its set has" },
  "comark/icon/download-failed": {
    code: "COMARK1005",
    title: "Pass the icon sets Iconify can't serve in `collections`",
  },
  "comark/icon/unknown-prop": { code: "COMARK1006", title: "Use only `:icon`'s props" },
} satisfies Record<`comark/icon/${string}`, RuleInfo>;
