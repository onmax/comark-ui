import type { RuleInfo } from "./types.ts";

// comark-tests' issues, COMARK3601 on.
export default {
  "comark/tests/missing-report": {
    code: "COMARK3601",
    title: "Give every `::tests` a `src` or an XML fence",
  },
  "comark/tests/content-dropped": {
    code: "COMARK3602",
    title: "Use `src` or a fence in `::tests`, not both",
  },
  "comark/tests/remote-src": { code: "COMARK3603", title: "Point `src` at a local file" },
  "comark/tests/outside-root": { code: "COMARK3604", title: "Keep the report under the root" },
  "comark/tests/file-not-found": {
    code: "COMARK3605",
    title: "Point `src` at a report that exists",
  },
  "comark/tests/read-failed": { code: "COMARK3606", title: "Give `::tests` a report it can read" },
  "comark/tests/malformed-xml": { code: "COMARK3607", title: "Fix the report's XML" },
  "comark/tests/not-junit": { code: "COMARK3608", title: "Show a JUnit report in `::tests`" },
  "comark/tests/unknown-prop": { code: "COMARK3609", title: "Use only `::tests`' props" },
} satisfies Record<`comark/tests/${string}`, RuleInfo>;
