import type { RuleInfo } from "./types.ts";

// comark-carousel's issues, COMARK0301 on.
export default {
  "comark/carousel/content-outside-slide": {
    code: "COMARK0301",
    title: "Keep a carousel's content inside its `:::slide` blocks",
  },
  "comark/carousel/empty-carousel": {
    code: "COMARK0302",
    title: "Give every `::carousel` a slide",
  },
  "comark/carousel/invalid-columns": {
    code: "COMARK0303",
    title: "Set `columns` to 1, 2, or 3",
  },
  "comark/carousel/unresolved-binding": {
    code: "COMARK0304",
    title: "Bind `:zoom` and `:title` to the document or its frontmatter",
  },
  "comark/carousel/slide-outside-carousel": {
    code: "COMARK0305",
    title: "Keep `:::slide` inside a `::carousel`",
  },
  "comark/carousel/unknown-prop": {
    code: "COMARK0306",
    title: "Use only `::carousel`'s and `:::slide`'s props",
  },
} satisfies Record<`comark/carousel/${string}`, RuleInfo>;
