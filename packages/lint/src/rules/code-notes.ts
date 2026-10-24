import type { RuleInfo } from "./types.ts";

// comark-code-notes' issues, COMARK3201 on.
export default {
  "comark/code-notes/missing-notes": {
    code: "COMARK3201",
    title: "Follow a fence with markers by a numbered list",
  },
  "comark/code-notes/marker-without-note": {
    code: "COMARK3202",
    title: "Give every marker a note",
  },
  "comark/code-notes/note-without-marker": {
    code: "COMARK3203",
    title: "Give every note a marker in the code",
  },
  "comark/code-notes/shiki-order": {
    code: "COMARK3204",
    title: "Put `comark-code-notes` after `shiki`",
  },
} satisfies Record<`comark/code-notes/${string}`, RuleInfo>;
