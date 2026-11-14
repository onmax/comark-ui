import type { RuleInfo } from "./types.ts";

// comark-git-graph's issues, COMARK4701 on.
export default {
  "comark/git-graph/missing-log": {
    code: "COMARK4701",
    title: "Paste `git log` output in every git graph",
  },
  "comark/git-graph/missing-parents": {
    code: "COMARK4702",
    title: "Run `git log` with `--parents`",
  },
  "comark/git-graph/unknown-branch": {
    code: "COMARK4703",
    title: "Pick onto branches the log shows",
  },
  "comark/git-graph/unknown-commit": { code: "COMARK4704", title: "Name commits the log shows" },
  "comark/git-graph/unknown-prop": { code: "COMARK4705", title: "Use only `::git-graph`'s props" },
  "comark/git-graph/invalid-max-count": {
    code: "COMARK4706",
    title: "Give `max-count` a whole number",
  },
  "comark/git-graph/content-dropped": {
    code: "COMARK4707",
    title: "Put only git's output in `::git-graph`",
  },
} satisfies Record<`comark/git-graph/${string}`, RuleInfo>;
