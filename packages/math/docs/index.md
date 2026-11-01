---
title: Math
description: LaTeX math in Markdown, typeset to MathML while parsing, with no math script, fonts, or stylesheet on the page.
keywords: latex, tex, katex, temml, mathjax, equation, formula, mathml, $$
tagline: Formulas written in LaTeX, typeset while parsing, in place of Comark's math plugin.
group: Markdown syntax
icon: sigma
blurb: LaTeX formulas as MathML
credits: 'Typeset by <a href="https://temml.org">Temml</a>, Ron Kok''s MathML fork of <a href="https://katex.org">KaTeX</a>.'
---

::examples
:::example{label="Inline and display"}
```md
The pond holds $n$ ducks, and each pair shares one roll, so the bakery bakes

$$
\binom{n}{2} = \frac{n(n-1)}{2}
$$

rolls a day.
```
:::

:::example{label="Aligned steps"}
```md
$$
\begin{aligned}
(a + b)^2 &= (a + b)(a + b) \\
          &= a^2 + 2ab + b^2
\end{aligned}
$$
```
:::

:::example{label="Prices stay text"}
```md
Bread costs $2 a pigeon and seed $5 in all, so $n$ pigeons cost $c = 2n + 5$.
```
:::
::

## Features

- `$…$` and `\(…\)` write inline math, and `$$…$$`, `\[…\]`, and a `math` fence write display math.
- Formulas become MathML while parsing, drawn in the browser's math font, so the page loads no script, font, or stylesheet.
- Prices such as `$5 and $10`, citations such as `\[1\]`, and anything in code stay text.
- A formula that doesn't typeset shows its TeX and adds an issue.
- The MathML keeps the TeX for screen readers and copying.

## Usage

Write inline math between single `$` signs, or between `\(` and `\)`. As in Pandoc, the opening `$` can't come before a space or a digit, and the closing one can't follow a space or come before a digit. Amounts of money stay text.

::example
```md
A duck with $m$ grams of bread and \(k\) friends keeps $\frac{m}{k+1}$ grams.
```
::

Write display math between `$$` signs, between `\[` and `\]`, or in a fence with the language `math`. A display formula sits centered on its own line and scrolls sideways when it's wider than the page.

::example
````md
$$
\int_0^\infty e^{-x^2}\,dx = \frac{\sqrt{\pi}}{2}
$$

```math
\sum_{i=1}^{n} i = \frac{n(n+1)}{2}
```
````
::

Code spans and code blocks never hold math. To show a dollar sign before a letter, escape it as `\$x`.

### Macros

Use the `macros` option to define commands every formula can use.

```ts
comarkUi({ math: { macros: { "\\R": "\\mathbb{R}" } } });
```

## Examples

### What stays text

- A `$` followed by a digit or a space doesn't open a formula, as in `$5 and $10`, `US$20`, and `$ x $`.
- Brackets around numbers, such as `\[1\]` and `\[2, 3\]`, are citations.
- An invalid formula shows its TeX and adds an issue. While streaming, an unfinished formula may add one until the rest arrives.

### From Comark's math plugin

Remove `comark/plugins/math`, KaTeX's stylesheet, and its `Math` component when you add `comark-mathml`. Comark's plugin leaves the TeX in the tree for a component to typeset with KaTeX in the reader's browser. This one typesets while parsing, so the page loads no KaTeX.

### KaTeX's HTML

For KaTeX's own fonts and layout instead of the browser's math font, set `output` to `"html"`, or to `"htmlAndMathml"` to keep MathML for screen readers. Install `katex` and put its stylesheet on the page:

```sh
pnpm add katex
```

```ts
import "katex/dist/katex.css";

comarkUi({ math: { output: "htmlAndMathml" } });
```

## API

### Options

Pass options under `math` in `comarkUi()`, or to `math()` alone.

| Option | Default | Description |
| --- | --- | --- |
| `output` | `"mathml"` | `"mathml"` typesets with Temml. `"html"` and `"htmlAndMathml"` typeset with KaTeX, which needs `katex` installed and `katex/dist/katex.css` on the page. |
| `macros` | `{}` | TeX commands every formula can use, such as `{ "\\R": "\\mathbb{R}" }`. |

### Typesetting

- `\href`, `\url`, and `\includegraphics` don't render.
- A macro that calls itself stops after 1,000 expansions.
- Sizes go up to 20em.

[Temml](https://temml.org) writes MathML that Chrome, Firefox, and Safari draw alike. KaTeX writes its MathML for screen readers, and Chrome draws it without `\cancel`, `\boxed`, wide accents such as `\widehat`, or `\mathbb` letters.

### Issues

The plugin adds these to `meta.issues`, as [Validation](/guide/validation/) describes:

- A formula whose TeX doesn't typeset, with the typesetter's reason. Its TeX shows in its place.
- An `output` that needs KaTeX when `katex` isn't installed. Formulas fall back to MathML.

```txt
Math `\frac{a}` failed to typeset: Unexpected end of input in a macro argument, expected '}'. Fix the TeX or wrap it in code.
```

Each has its own rule in [Doctor](/doctor/).

### Package

comark-ui installs and registers `comark-mathml`. To use it alone, install it with Comark and a renderer, and register it instead of `comark/plugins/math`:

```sh
pnpm add comark @comark/html comark-mathml
```

```ts
import { createHtmlRenderer } from "@comark/html";
import math, { components } from "comark-mathml/html";

const render = createHtmlRenderer({ plugins: [math()], components });
```

For Vue, React, or Svelte, import from `comark-mathml/vue`, `comark-mathml/react`, or `comark-mathml/svelte`. The components add the styles on mount. On a server-rendered page, also import `comark-mathml/style.css` so it doesn't shift. [Renderers](/guide/renderers/) covers using it with other plugins.

## Theme

Formulas take the text's color and the system's math font. The rules sit in a `comark` CSS layer, so any plain rule of yours wins.

### Shared tokens

| Token | Used for |
| --- | --- |
| `--comark-muted` | The TeX of a formula that didn't typeset |

### Variables

| Variable | Default | Used for |
| --- | --- | --- |
| `--cmh-font` | `"STIX Two Math", "Cambria Math", "Latin Modern Math", "Noto Sans Math", math` | The formulas' font |

### Classes

| Class | Element |
| --- | --- |
| `.cmh` | The `span` around a formula's `math` |
| `.cmh-display` | Added to display math, centered and scrolling sideways |
| `.cmh-source` | Added when the formula didn't typeset and shows its TeX |
