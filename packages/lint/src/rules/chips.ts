import type { RuleInfo } from "./types.ts";

// comark-chips's issues, COMARK0501 on.
export default {
  "comark/chips/invalid-href": {
    code: "COMARK0501",
    title: "Give every `:chip` a web address in `href`",
  },
  "comark/chips/invalid-avatar": {
    code: "COMARK0502",
    title: "Write `avatar` as an image URL, `@user`, or `provider:name`",
  },
  "comark/chips/missing-avatar": {
    code: "COMARK0503",
    title: "Point a chip's avatar at an account or image that exists",
  },
  "comark/chips/rate-limited": {
    code: "COMARK0504",
    title: "Build again once unavatar.io answers",
  },
} satisfies Record<`comark/chips/${string}`, RuleInfo>;
