import type { RuleInfo } from "./types.ts";

// comark-file-tree's issues, COMARK2001 on. Its icons are drawn or left plain, so they report nothing.
export default {
  "comark/file-tree/list-instead-of-fence": {
    code: "COMARK2001",
    title: "Write a `::file-tree` in a fenced block, not a list",
  },
  "comark/file-tree/empty-tree": {
    code: "COMARK2002",
    title: "Give every `::file-tree` at least one entry",
  },
  "comark/file-tree/content-dropped": {
    code: "COMARK2003",
    title: "Put only one fenced block inside `::file-tree`",
  },
  "comark/file-tree/unknown-prop": { code: "COMARK2004", title: "Give `::file-tree` no props" },
} satisfies Record<`comark/file-tree/${string}`, RuleInfo>;
