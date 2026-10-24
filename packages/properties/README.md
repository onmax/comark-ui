# comark-properties

[![npm version](https://npmx.dev/api/registry/badge/version/comark-properties)](https://npmx.dev/package/comark-properties)
[![npm downloads](https://npmx.dev/api/registry/badge/downloads-month/comark-properties)](https://npmx.dev/package/comark-properties)
[![install size](https://npmx.dev/api/registry/badge/size/comark-properties)](https://npmx.dev/package/comark-properties)
[![license](https://npmx.dev/api/registry/badge/license/comark-properties)](https://npmx.dev/package/comark-properties)
[![docs](https://img.shields.io/badge/docs-comark--ui.onmax.me-14b8a6?labelColor=0a0a0a)](https://comark-ui.onmax.me/properties/)

A document's chosen frontmatter keys, such as status, pull request, author, date, and tags, as a box of properties at the top or where `::properties` sits. A [Comark](https://comark.dev) plugin for HTML, Vue, React, and Svelte.

```sh
pnpm add comark comark-properties
```

```ts
import { createHtmlRenderer } from "@comark/html";
import properties, { components } from "comark-properties/html";

const render = createHtmlRenderer({ plugins: [properties()], components });
```

```md
---
status: Ready for review
pr: https://github.com/onmax/comark-ui/pull/111
author: onmax
date: 2026-10-23
tags: [colors, docs]
---
```

Options: `keys` (default `["status", "pr", "author", "date", "tags"]`), `labels` per key, and `top` (default true) to put the box at the top of a document with no `::properties`. A pull request or issue link reads as `owner/repo#123`, any other link as its address, and a list as badges.

The plugin adds every problem to `meta.issues`: a value it can't show, a `::properties` with nothing to show, and content inside it. Each issue names the key or block and says how to fix it.

## Renderers

| Renderer | Import |
| --- | --- |
| `@comark/html` | `comark-properties/html`: the styles are inlined once per document |
| `@comark/vue` | `comark-properties/vue` |
| `@comark/react` | `comark-properties/react` |
| `@comark/svelte` | `comark-properties/svelte` |

Each entry exports the parse plugin as `default` and the renderer's `components`. The Vue, React, and Svelte components add the styles when they mount; import `comark-properties/style.css` with your styles so a server-rendered page doesn't shift.

The styles follow shadcn/ui: they read its CSS variables, such as `--background` and `--border`, when the page has them, and use its neutral theme otherwise. Set the shared `--comark-*` tokens to theme every plugin at once; the rules sit in a `comark` CSS layer, so any plain rule of your own wins.
