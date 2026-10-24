# comark-xref

[![npm version](https://npmx.dev/api/registry/badge/version/comark-xref)](https://npmx.dev/package/comark-xref)
[![npm downloads](https://npmx.dev/api/registry/badge/downloads-month/comark-xref)](https://npmx.dev/package/comark-xref)
[![install size](https://npmx.dev/api/registry/badge/size/comark-xref)](https://npmx.dev/package/comark-xref)
[![license](https://npmx.dev/api/registry/badge/license/comark-xref)](https://npmx.dev/package/comark-xref)
[![docs](https://img.shields.io/badge/docs-comark--ui.onmax.me-14b8a6?labelColor=0a0a0a)](https://comark-ui.onmax.me/xref/)

Numbered figures and tables, and references to them. A [Comark](https://comark.dev) plugin for any renderer.

```sh
pnpm add comark comark-xref
```

```ts
import { createHtmlRenderer } from "@comark/html";
import xref from "comark-xref";

const render = createHtmlRenderer({ plugins: [xref()] });
```

```md
As :ref{#fig-login} shows, the button moved.

![The login page](login.png){#fig-login}

::table{#tbl-times caption="Homing times"}
| Bird | Time |
| --- | --- |
| Rosa | 1 h 52 min |
::
```

An image alone in its paragraph with a `fig-` id becomes a figure captioned "Figure 1: " and its alt text; a table in a `::table` with a `tbl-` id gets a caption "Table 1: " and its `caption`. `:ref{#id}` becomes a link that reads "Figure 1". Figures and tables are numbered apart, in document order. The words come from the `figure` and `table` options. Pandoc's `@fig-x` isn't read, since `@name` is a mention in comark-chips and comark-github.

It needs no components or styles: its output is `figure`, `figcaption`, `caption`, and `a`, with the classes `cxr`, `cxr-label`, and `cxr-ref` for your own rules.

The plugin adds every problem to `meta.issues`: a reference with no id or to a label that doesn't exist, a label used twice, a labeled image that shares its paragraph with text, and text inside a `:ref`, which it drops. Each issue names its block and says how to fix it.
