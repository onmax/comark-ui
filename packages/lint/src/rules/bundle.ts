import type { RuleInfo } from "./types.ts";

// comark-bundle's issues, COMARK4801 on.
export default {
  "comark/bundle/missing-build": { code: "COMARK4801", title: "Give every `::bundle` a build" },
  "comark/bundle/missing-side": {
    code: "COMARK4802",
    title: "Give `::bundle` both `before` and `after`",
  },
  "comark/bundle/mixed-props": {
    code: "COMARK4803",
    title: "Use `src` or `before` and `after` in `::bundle`, not both",
  },
  "comark/bundle/unknown-prop": { code: "COMARK4804", title: "Use only `::bundle`'s props" },
  "comark/bundle/content-dropped": {
    code: "COMARK4805",
    title: "Write nothing inside `::bundle`",
  },
  "comark/bundle/remote-src": { code: "COMARK4806", title: "Point `::bundle` at local builds" },
  "comark/bundle/outside-root": { code: "COMARK4807", title: "Keep the builds under the root" },
  "comark/bundle/not-found": {
    code: "COMARK4808",
    title: "Point `::bundle` at builds that exist",
  },
  "comark/bundle/unreadable": {
    code: "COMARK4809",
    title: "Point `::bundle` at a build folder or a Sonda report",
  },
} satisfies Record<`comark/bundle/${string}`, RuleInfo>;
