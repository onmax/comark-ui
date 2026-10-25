The `output` option's `"html"` and `"htmlAndMathml"` typeset with KaTeX, which comark-math doesn't install. Without it, formulas are typeset as MathML, the default, and this issue says so once per document. Install `katex` and put `katex/dist/katex.css` on the page, or drop the `output` option.

```sh
pnpm add katex
```

```ts
import "katex/dist/katex.css";
import math from "comark-math";

const plugins = [math({ output: "html" })];
```
