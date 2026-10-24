import type { RuleInfo } from "./types.ts";

// comark-include's issues, COMARK1101 on.
export default {
  "comark/include/missing-src": { code: "COMARK1101", title: "Give every `:include` a `src`" },
  "comark/include/unknown-option": {
    code: "COMARK1102",
    title: "Use only `:include`'s options",
  },
  "comark/include/remote-file": { code: "COMARK1103", title: "Include only local files" },
  "comark/include/path-outside-root": {
    code: "COMARK1104",
    title: "Keep included paths under the root",
    severity: "error",
  },
  "comark/include/lines-and-region": {
    code: "COMARK1105",
    title: "Use `lines` or `region`, not both",
  },
  "comark/include/include-cycle": {
    code: "COMARK1106",
    title: "Don't let a file include itself",
  },
  "comark/include/too-deep": {
    code: "COMARK1107",
    title: "Nest includes no deeper than `depth`",
  },
  "comark/include/read-failed": {
    code: "COMARK1108",
    title: "Include a file that can be read",
  },
  "comark/include/file-not-found": {
    code: "COMARK1109",
    title: "Include a file that exists",
  },
  "comark/include/invalid-lines": {
    code: "COMARK1110",
    title: "Write `lines` as a range inside the file",
  },
  "comark/include/missing-region": {
    code: "COMARK1111",
    title: "Name a `region` the file marks",
  },
  "comark/include/unclosed-region": {
    code: "COMARK1112",
    title: "End every `#region` with `#endregion`",
  },
  "comark/include/open-block-in-partial": {
    code: "COMARK1113",
    title: "Close a partial's `::` blocks inside it",
  },
  "comark/include/misplaced-include": {
    code: "COMARK1114",
    title: "Write `:include` alone on its own line",
  },
} satisfies Record<`comark/include/${string}`, RuleInfo>;
