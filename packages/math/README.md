# comark-mathml

[![npm version](https://comark-ui.onmax.me/badge.svg?source=npm-version&package=comark-mathml&icon=npm)](https://npmx.dev/package/comark-mathml)
[![npm downloads](https://comark-ui.onmax.me/badge.svg?source=npm-downloads&package=comark-mathml&period=month&icon=npm)](https://npmx.dev/package/comark-mathml)
[![license](https://comark-ui.onmax.me/badge.svg?label=license&value=MIT)](https://npmx.dev/package/comark-mathml)
[![docs](https://comark-ui.onmax.me/badge.svg?label=docs&value=comark-ui.onmax.me)](https://comark-ui.onmax.me/math/)

LaTeX math in [Comark](https://comark.dev), in place of `comark/plugins/math`: `$…$` and `\(…\)` inline, `$$…$$`, `\[…\]`, and `math` fences as display math, typeset to MathML while parsing, so the page loads no math script, fonts, or stylesheet. For HTML, Vue, React, and Svelte.

```sh
pnpm add comark comark-mathml
```

```ts
import { createHtmlRenderer } from "@comark/html";
import math, { components } from "comark-mathml/html";

const render = createHtmlRenderer({ plugins: [math()], components });
```

```md
The pond holds $n$ ducks, and each pair shares one roll:

$$
\binom{n}{2} = \frac{n(n-1)}{2}
$$
```

The parse plugin typesets each formula with [Temml](https://temml.org) while parsing. `\href` and `\url` don't render. Prices such as `$5 and $10`, citations such as `\[1\]`, and anything in code stay text. `output: "html"` or `"htmlAndMathml"` uses KaTeX's HTML instead, which needs `katex` installed and `katex/dist/katex.css` on the page.

The plugin adds every formula that doesn't typeset to `meta.issues`, with the reason, and renders its TeX in its place.

## Renderers

| Renderer | Import |
| --- | --- |
| `@comark/html` | `comark-mathml/html`: the styles are inlined |
| `@comark/vue` | `comark-mathml/vue` |
| `@comark/react` | `comark-mathml/react` |
| `@comark/svelte` | `comark-mathml/svelte` |

Each entry exports the parse plugin as `default` and the renderer's `components`. The Vue, React, and Svelte components add the styles when they mount; import `comark-mathml/style.css` with your styles so a server-rendered page doesn't shift.
