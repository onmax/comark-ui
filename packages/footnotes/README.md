# comark-footnotes

[![npm version](https://comark-ui.onmax.me/badge.svg?source=npm-version&package=comark-footnotes&icon=npm)](https://npmx.dev/package/comark-footnotes)
[![npm downloads](https://comark-ui.onmax.me/badge.svg?source=npm-downloads&package=comark-footnotes&period=month&icon=npm)](https://npmx.dev/package/comark-footnotes)
[![license](https://comark-ui.onmax.me/badge.svg?label=license&value=MIT)](https://npmx.dev/package/comark-footnotes)
[![docs](https://comark-ui.onmax.me/badge.svg?label=docs&value=comark-ui.onmax.me)](https://comark-ui.onmax.me/footnotes/)

Footnotes in [Comark](https://comark.dev), in place of `comark/plugins/footnotes`: `[^1]` references, `[^1]:` definitions that hold any Markdown over several lines and blocks, and `^[inline notes]`. A parse plugin with no components, so it works in any renderer.

```sh
pnpm add comark comark-footnotes
```

```ts
import { parseMarkdown } from "comark";
import footnotes from "comark-footnotes";

const document = await parseMarkdown(markdown, {
  plugins: [footnotes()],
});
```

```md
The deploy waits when the roof holds more than 12 pigeons[^count], unless it's a hotfix^[Two approvals.].

[^count]: Counted once, from the window,
    at 9:00.

    Pigeons that fly off mid-count still count.
```

Notes are numbered in the order they're first referenced and listed in a section at the end. It takes the same options as Comark's plugin (`label`, `hr`, `backRef`) and writes the same nodes. Remove `comark/plugins/footnotes` when you add this one.

Compared with Comark's plugin, a definition inside fenced code stays in the code, Markdown in a note renders, and a note can run over several lines and blocks. A reference used twice gets its own id, `fnref-label-2`.

## Issues

A reference with no definition stays as text, and a definition nothing references is dropped. Each adds a sentence to `meta.issues`:

```txt
footnotes: [^gone] has no definition; add a "[^gone]: …" line, or remove the reference.
footnotes: [^spare]: is never referenced; add [^spare] where it applies, or remove the definition.
```

## Credits

The parser is ported from [markdown-it-footnote](https://github.com/markdown-it/markdown-it-footnote) by Vitaly Puzrin and Alex Kocharin, MIT.
