import type { RuleInfo } from "./types.ts";

// comark-sources' issues, COMARK3001 on.
export default {
  "comark/sources/invalid-cite": {
    code: "COMARK3001",
    title: "Write source numbers inside `:cite`",
  },
  "comark/sources/unknown-source": {
    code: "COMARK3002",
    title: "Cite only sources `::sources` lists",
  },
  "comark/sources/missing-list": {
    code: "COMARK3003",
    title: "Give `::sources` a numbered list",
  },
  "comark/sources/second-list": {
    code: "COMARK3004",
    title: "Keep one `::sources` per document",
  },
  "comark/sources/missing-link": { code: "COMARK3005", title: "Link every source" },
  "comark/sources/content-dropped": {
    code: "COMARK3006",
    title: "Keep only the list inside `::sources`",
  },
  "comark/sources/unknown-prop": { code: "COMARK3007", title: "Use only `::sources`' props" },
} satisfies Record<`comark/sources/${string}`, RuleInfo>;
