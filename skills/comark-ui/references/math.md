# Math

comark-math typesets LaTeX formulas to MathML while parsing, so the page loads no math script, fonts, or stylesheet. Use it for a formula the prose would garble, such as a complexity bound, a rate, or how a number in the report was computed. Plain numbers and units stay text.

## Syntax

```md
The cache holds $n$ entries, and each lookup costs \(O(\log n)\).

$$
\text{hit rate} = \frac{\text{hits}}{\text{hits} + \text{misses}}
$$
```

- `$…$` and `\(…\)` are inline math. The opening `$` can't be followed by a space or a digit, and the closing one can't follow a space or come before a digit, so `$5 and $10` stay text. Escape a dollar before a letter as `\$x`.
- `$$…$$`, `\[…\]`, and a fence with the language `math` are display math, centered on their own line. `\[1\]`, numbers in brackets, stays a citation.
- Math is never read inside code spans or code blocks.
- `\href`, `\url`, and `\includegraphics` don't render, and a macro that calls itself stops after 1,000 expansions.

The plugin reports a formula whose TeX doesn't typeset, with the typesetter's reason, and renders its TeX in its place. Fix the TeX, or put it in code when it isn't math.

## Register

- In `comark-ui`: on by default, in place of Comark's own math plugin. `math: { macros: { "\\R": "\\mathbb{R}" } }` defines commands every formula can use. `math: { output: "htmlAndMathml" }` uses KaTeX's HTML instead, which needs `katex` installed and `katex/dist/katex.css` on the page.
- Alone: `pnpm add comark @comark/html comark-math`, then `plugins: [math()]` and `components` from `comark-math/html` (or `/vue`, `/react`, `/svelte`). It is named `math`, and Comark keeps the first plugin of a name, so remove `comark/plugins/math` from the list instead of adding this one after it.
