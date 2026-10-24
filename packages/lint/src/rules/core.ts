import type { RuleInfo } from "./types.ts";

export default {
  "comark/unclosed-block": { code: "COMARK0001", title: "Close every `::` block" },
  "comark/unknown-component": { code: "COMARK0002", title: "Use only known components" },
  "comark/malformed-attributes": {
    code: "COMARK0003",
    title: "Close `{` attributes and set each key once",
  },
  "comark/broken-anchor": {
    code: "COMARK0004",
    title: "Link `#fragments` to a heading or id in the document they name",
  },
  "comark/invalid-frontmatter": {
    code: "COMARK0005",
    title: "Write valid YAML frontmatter",
    severity: "error",
  },
  "comark/plugin-issue": { code: "COMARK0006", title: "Fix the problems Comark plugins report" },
  "comark/unsafe-url": {
    code: "COMARK0007",
    title: "Keep script URLs out of `href` and `src`",
    severity: "error",
  },
  "comark/duplicate-id": { code: "COMARK0008", title: "Give each element its own id" },
  "comark/missing-alt": { code: "COMARK0009", title: "Describe every image in its alt text" },
  "comark/empty-link": { code: "COMARK0010", title: "Give every link text" },
  "comark/broken-link": { code: "COMARK0011", title: "Link files that exist" },
  "comark/blocked-url": {
    code: "COMARK0012",
    title: "Keep local, private, tunnel, and preview URLs out of links",
  },
  "comark/dead-url": { code: "COMARK0013", title: "Link pages that still answer" },
} satisfies Record<`comark/${string}`, RuleInfo>;
