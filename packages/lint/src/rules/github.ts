import type { RuleInfo } from "./types.ts";

// comark-github's issues, COMARK0901 on.
export default {
  "comark/github/invalid-repo": {
    code: "COMARK0901",
    title: "Set `references({ repo })` to `owner/name`",
  },
  "comark/github/unknown-callout-type": {
    code: "COMARK0902",
    title: "Use one of GitHub's five callout types",
  },
} satisfies Record<`comark/github/${string}`, RuleInfo>;
