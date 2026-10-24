# comark-footnotes

[![npm version](https://npmx.dev/api/registry/badge/version/comark-footnotes)](https://npmx.dev/package/comark-footnotes)
[![npm downloads](https://npmx.dev/api/registry/badge/downloads-month/comark-footnotes)](https://npmx.dev/package/comark-footnotes)
[![install size](https://npmx.dev/api/registry/badge/size/comark-footnotes)](https://npmx.dev/package/comark-footnotes)
[![license](https://npmx.dev/api/registry/badge/license/comark-footnotes)](https://npmx.dev/package/comark-footnotes)
[![docs](https://img.shields.io/badge/docs-comark--ui.onmax.me-14b8a6?labelColor=0a0a0a)](https://comark-ui.onmax.me/footnotes/)

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

Notes are numbered in the order they're first referenced and listed in a section at the end. It is named `footnotes`, like Comark's plugin, and takes the same options (`label`, `hr`, `backRef`) and writes the same nodes, so it replaces it. When a plugin list holds both, Comark keeps the first.

Compared with Comark's plugin, a definition inside fenced code stays in the code, Markdown in a note renders, and a note can run over several lines and blocks. A reference used twice gets its own id, `fnref-label-2`.

## Issues

A reference with no definition stays as text, and a definition nothing references is dropped. Each adds a sentence to `meta.issues`:

```txt
footnotes: [^gone] has no definition; add a "[^gone]: …" line, or remove the reference.
footnotes: [^spare]: is never referenced; add [^spare] where it applies, or remove the definition.
```

## Credits

The parser is ported from [markdown-it-footnote](https://github.com/markdown-it/markdown-it-footnote) by Vitaly Puzrin and Alex Kocharin, MIT.
