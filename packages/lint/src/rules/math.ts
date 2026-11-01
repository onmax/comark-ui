import type { RuleInfo } from "./types.ts";

// comark-mathml's issues, COMARK4101 on.
export default {
  "comark/math/invalid-tex": { code: "COMARK4101", title: "Write math that typesets" },
  "comark/math/katex-missing": {
    code: "COMARK4102",
    title: "Install `katex` for math's `html` output",
  },
  "comark/math/authored-html": {
    code: "COMARK4103",
    title: "Write math between `$` signs, not as a formula's `html`",
  },
} satisfies Record<`comark/math/${string}`, RuleInfo>;
