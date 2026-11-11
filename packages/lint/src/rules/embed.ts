import type { RuleInfo } from "./types.ts";

// comark-embed's issues, COMARK0801 on.
export default {
  "comark/embed/content-dropped": {
    code: "COMARK0801",
    title: "Keep content out of `::embed`",
  },
  "comark/embed/missing-url": { code: "COMARK0802", title: "Give every `::embed` a `url`" },
  "comark/embed/insecure-url": { code: "COMARK0803", title: "Embed only https:// links" },
  "comark/embed/credentials-in-url": {
    code: "COMARK0804",
    title: "Keep user names and passwords out of embed links",
  },
  "comark/embed/invalid-start": {
    code: "COMARK0805",
    title: "Write `start` as whole seconds",
  },
  "comark/embed/start-unsupported": {
    code: "COMARK0806",
    title: "Set `start` only on YouTube and Vimeo videos",
  },
  "comark/embed/card-without-title": {
    code: "COMARK0807",
    title: "Give a link card a `title`",
  },
  "comark/embed/unreadable-link": {
    code: "COMARK0808",
    title: "Link a provider's page it can read an ID from",
  },
  "comark/embed/unknown-prop": { code: "COMARK0809", title: "Use only `::embed`'s props" },
  "comark/embed/invalid-height": {
    code: "COMARK0810",
    title: "Write `height` as whole pixels",
  },
  "comark/embed/height-unsupported": {
    code: "COMARK0811",
    title: "Set `height` only on players without a height of their own",
  },
  "comark/embed/player-failed": {
    code: "COMARK0812",
    title: "Return nothing from `player` for a link it can't read",
  },
} satisfies Record<`comark/embed/${string}`, RuleInfo>;
