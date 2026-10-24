import type { RuleInfo } from "./types.ts";

// comark-table's issues, COMARK2601 on.
export default {
  "comark/table/empty-block": {
    code: "COMARK2601",
    title: "Give every `::table` a file or a table to show",
  },
  "comark/table/content-dropped": {
    code: "COMARK2602",
    title: "Give `::table` a `src` or content, not both",
  },
  "comark/table/remote-src": { code: "COMARK2603", title: "Read tables only from local files" },
  "comark/table/path-outside-root": {
    code: "COMARK2604",
    title: "Keep a table's `src` under the root",
    severity: "error",
  },
  "comark/table/file-not-found": {
    code: "COMARK2605",
    title: "Read a table from a file that exists",
  },
  "comark/table/read-failed": {
    code: "COMARK2606",
    title: "Read a table from a file that can be read",
  },
  "comark/table/unknown-format": { code: "COMARK2607", title: "Give a table CSV, TSV, or JSON" },
  "comark/table/invalid-json": { code: "COMARK2608", title: "Write a table's JSON so it parses" },
  "comark/table/json-not-rows": {
    code: "COMARK2609",
    title: "Write a table's JSON as an array of objects",
  },
  "comark/table/unclosed-quote": { code: "COMARK2610", title: "Close every quoted cell" },
  "comark/table/no-rows": { code: "COMARK2611", title: "Give a table a header and a row of data" },
  "comark/table/uneven-row": { code: "COMARK2612", title: "Give every row one cell per column" },
  "comark/table/base-outside-root": {
    code: "COMARK2613",
    title: "Set `base` to a folder under the root",
  },
  "comark/table/unknown-prop": { code: "COMARK2614", title: "Use only `::table`'s props" },
  "comark/table/unknown-tone": {
    code: "COMARK2615",
    title: "Color a cell with `success`, `warning`, `error`, or `info`",
  },
  "comark/table/partial-tone": { code: "COMARK2616", title: "Fill the cell with its tone span" },
} satisfies Record<`comark/table/${string}`, RuleInfo>;
