# comark-outline

[![npm version](https://npmx.dev/api/registry/badge/version/comark-outline)](https://npmx.dev/package/comark-outline)
[![npm downloads](https://npmx.dev/api/registry/badge/downloads-month/comark-outline)](https://npmx.dev/package/comark-outline)
[![install size](https://npmx.dev/api/registry/badge/size/comark-outline)](https://npmx.dev/package/comark-outline)
[![license](https://npmx.dev/api/registry/badge/license/comark-outline)](https://npmx.dev/package/comark-outline)
[![docs](https://img.shields.io/badge/docs-comark--ui.onmax.me-14b8a6?labelColor=0a0a0a)](https://comark-ui.onmax.me/outline/)

A table of contents in the body of a page: `::toc` becomes a nested list of links to the page's headings. A [Comark](https://comark.dev) plugin for HTML, Vue, React, and Svelte.

```sh
pnpm add comark comark-outline
```

```ts
import { createHtmlRenderer } from "@comark/html";
import toc, { components } from "comark-outline/html";

const render = createHtmlRenderer({ plugins: [toc()], components });
```

```md
::toc{depth=3 title="On this page"}
::
```

The package is `comark-outline` because npm refuses `comark-toc` as too close to `remark-toc`; the block is still `::toc`. It lists h2 headings down to `depth` (default 3), each under the closest heading above it, and links to the ids Comark gives them. It reads the headings itself, so it doesn't depend on plugin order or on Comark's toc plugin. `[[toc]]` isn't read, since Comark parses `[[...]]` as a span.

The plugin adds every problem to `meta.issues`: a `depth` outside 2 to 6, content inside the block, and a page with no headings to list. Each issue names its block and says how to fix it.

## Renderers

| Renderer | Import |
| --- | --- |
| `@comark/html` | `comark-outline/html`: the styles are inlined once per document |
| `@comark/vue` | `comark-outline/vue` |
| `@comark/react` | `comark-outline/react` |
| `@comark/svelte` | `comark-outline/svelte` |

Each entry exports the parse plugin as `default` and the renderer's `components`. The Vue, React, and Svelte components add the styles when they mount; import `comark-outline/style.css` with your styles so a server-rendered page doesn't shift.

The styles follow shadcn/ui: they read its CSS variables, such as `--background` and `--border`, when the page has them, and use its neutral theme otherwise. Set the shared `--comark-*` tokens to theme every plugin at once; the rules sit in a `comark` CSS layer, so any plain rule of your own wins.
