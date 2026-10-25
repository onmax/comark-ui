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
- Each formula is typeset once while parsing, as MathML, which every current browser draws with its own math font. The page loads no script, font, or stylesheet for it.
- Prices such as `$5 and $10`, citations such as `\[1\]`, and anything in code stay text.
- A formula that doesn't typeset shows its TeX, and the plugin reports it.
- The TeX stays in the MathML, where screen readers and copy can read it.

## Usage

Write inline math between single `$` signs, or between `\(` and `\)`. The opening `$` can't be followed by a space or a digit, and the closing one can't follow a space or come before a digit, as in Pandoc, so amounts of money stay text.

::example
```md
A duck with $m$ grams of bread and \(k\) friends keeps $\frac{m}{k+1}$ grams.
```
::

Write display math between `$$` signs, between `\[` and `\]`, or in a fence with the language `math`. A display formula is centered on its own line, and scrolls sideways when it's wider than the page.

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

Math is never read inside code spans or code blocks. To show a dollar sign before a letter, escape it: `\$x`.

### Macros

Use the `macros` option to define commands every formula can use.

```ts
comarkUi({ math: { macros: { "\\R": "\\mathbb{R}" } } });
```

## Examples

### What stays text

- `$5 and $10`, `US$20`, and `$ x $`: a `$` followed by a digit or a space doesn't open a formula.
- `\[1\]` and `\[2, 3\]`: brackets around numbers are citations.
- Invalid formulas show their TeX and report an issue, including at the end of a document. Comark auto-closes dollar delimiters before plugins run, so incomplete streaming formulas may also report an issue until the rest arrives.

### From Comark's math plugin

Swap `comark/plugins/math` for `comark-math`, and drop KaTeX's stylesheet and its `Math` component. This plugin is named `math` too, so a list holds one or the other. When a list holds both, Comark keeps the first, so remove the import from `comark/plugins/math` rather than adding this one after it.

Comark's plugin leaves the TeX in the tree and typesets it with KaTeX in a component, in the reader's browser. This one typesets while parsing and stores the MathML on the node, so renderers only draw it and the page loads no KaTeX.

### KaTeX's HTML

MathML is drawn in the browser's math font. For KaTeX's own fonts and layout, set `output` to `"html"`, or `"htmlAndMathml"` to keep MathML for screen readers. Install `katex` and put its stylesheet on the page:

```sh
pnpm add katex
```

```ts
import "katex/dist/katex.css";

comarkUi({ math: { output: "htmlAndMathml" } });
```

## API

### Options

The options go under `math` in `comarkUi()`, or to `math()` when you use the plugin alone.

| Option | Default | Description |
| --- | --- | --- |
| `output` | `"mathml"` | `"mathml"` typesets with Temml. `"html"` and `"htmlAndMathml"` typeset with KaTeX, which needs `katex` installed and `katex/dist/katex.css` on the page. |
| `macros` | `{}` | TeX commands every formula can use, such as `{ "\\R": "\\mathbb{R}" }`. |

### Typesetting

Formulas are typeset with `trust: false`, so `\href`, `\url`, and `\includegraphics` don't render; with at most 1,000 macro expansions, so a macro that calls itself stops; and with sizes up to 20em. Each formula is typeset once per process, keyed on its TeX, whether it's display math, and the options, so a site that builds many pages typesets a shared formula once.

[Temml](https://temml.org) writes MathML that Chrome, Firefox, and Safari draw alike. KaTeX's MathML is written for screen readers, and Chrome draws it without `\cancel`, `\boxed`, wide accents such as `\widehat`, or `\mathbb` letters. Temml is also smaller: 50 kB gzipped against KaTeX's 76 kB.

### Issues

The plugin adds these problems to `meta.issues`, as [Validation](/guide/validation/) describes:

- A formula whose TeX doesn't typeset, with the typesetter's reason. Its TeX shows in its place.
- An `output` that needs KaTeX when `katex` isn't installed. Formulas are then typeset as MathML.

```txt
Math `\frac{a}` failed to typeset: Unexpected end of input in a macro argument, expected '}'. Fix the TeX or wrap it in code.
```

Each has its own rule in [Doctor](/doctor/).

### Package

comark-ui brings `comark-math` and registers it. To use it alone, install it with Comark and a renderer, and register it instead of `comark/plugins/math`:

```sh
pnpm add comark @comark/html comark-math
```

```ts
import { createHtmlRenderer } from "@comark/html";
import math, { components } from "comark-math/html";

const render = createHtmlRenderer({ plugins: [math()], components });
```

For Vue, React, or Svelte, import from `comark-math/vue`, `comark-math/react`, or `comark-math/svelte`. The components add the styles when they mount. Import `comark-math/style.css` with your styles so a server-rendered page doesn't shift. [Renderers](/guide/renderers/) covers using it with other plugins.

It works with `registerDefaultPlugins: false` and in streaming parses.

## Theme

Formulas take the text's color and the system's math font. The rules sit in a `comark` CSS layer, so any plain rule of your own wins.

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
