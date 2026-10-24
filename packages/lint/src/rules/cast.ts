import type { RuleInfo } from "./types.ts";

// comark-cast's issues, COMARK2201 on.
export default {
  "comark/cast/missing-cast": { code: "COMARK2201", title: "Give every `::cast` a cast" },
  "comark/cast/unknown-prop": { code: "COMARK2202", title: "Use only `::cast`'s props" },
  "comark/cast/invalid-mode": { code: "COMARK2203", title: "Set `mode` to `screen` or `log`" },
  "comark/cast/src-and-code": {
    code: "COMARK2204",
    title: "Give a `::cast` a `src` or a code block, not both",
  },
  "comark/cast/remote-file": { code: "COMARK2205", title: "Read casts from local files" },
  "comark/cast/path-outside-root": {
    code: "COMARK2206",
    title: "Keep cast paths under the root",
    severity: "error",
  },
  "comark/cast/read-failed": {
    code: "COMARK2207",
    title: "Point `src` at a file that can be read",
  },
  "comark/cast/file-not-found": { code: "COMARK2208", title: "Point `src` at a file that exists" },
  "comark/cast/invalid-header": {
    code: "COMARK2209",
    title: "Start a cast with an asciinema v2 or v3 header",
  },
  "comark/cast/invalid-event": {
    code: "COMARK2210",
    title: "Write every line after the header as an event",
  },
  "comark/cast/no-output": { code: "COMARK2211", title: "Record a cast with output" },
} satisfies Record<`comark/cast/${string}`, RuleInfo>;
