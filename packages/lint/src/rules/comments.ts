import type { RuleInfo } from "./types.ts";

// comark-comments' issues, COMARK4301 on.
export default {
  "comark/comments/unknown-prop": {
    code: "COMARK4301",
    title: "Use only the props of `:suggestion` and `:comment`",
  },
  "comark/comments/empty-suggestion": {
    code: "COMARK4302",
    title: "Give every `:suggestion` new text, a `from`, or both",
  },
  "comark/comments/unchanged-suggestion": {
    code: "COMARK4303",
    title: "Make a `:suggestion`'s new text differ from its `from`",
  },
  "comark/comments/invalid-mark": {
    code: "COMARK4304",
    title: 'Write `mark="track"` or `mark="pen"`',
  },
  "comark/comments/missing-anchor": {
    code: "COMARK4305",
    title: "Put the words a `:comment` is about in its brackets",
  },
  "comark/comments/missing-note": {
    code: "COMARK4306",
    title: "Give every comment and reply a `note`",
  },
  "comark/comments/duplicate-id": {
    code: "COMARK4307",
    title: "Give each comment and suggestion its own `#id`",
    severity: "error",
  },
  "comark/comments/unknown-reply": {
    code: "COMARK4308",
    title: "Point every `reply` at a comment's or suggestion's `#id`",
    severity: "error",
  },
  "comark/comments/reply-with-text": {
    code: "COMARK4309",
    title: "Write a reply with no brackets",
  },
  "comark/comments/nested-thread": {
    code: "COMARK4310",
    title: "Keep comments and suggestions out of each other",
  },
  "comark/comments/outside-margin": {
    code: "COMARK4311",
    title: "Keep comments and suggestions out of headings and table cells",
  },
  "comark/comments/undefined-binding": {
    code: "COMARK4312",
    title: "Point bound comment props at defined values",
  },
} satisfies Record<`comark/comments/${string}`, RuleInfo>;
