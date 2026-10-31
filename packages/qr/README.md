# comark-qr

[![npm version](https://comark-ui.onmax.me/badge.svg?source=npm-version&package=comark-qr&icon=npm)](https://npmx.dev/package/comark-qr)
[![npm downloads](https://comark-ui.onmax.me/badge.svg?source=npm-downloads&package=comark-qr&period=month&icon=npm)](https://npmx.dev/package/comark-qr)
[![license](https://comark-ui.onmax.me/badge.svg?label=license&value=MIT)](https://npmx.dev/package/comark-qr)
[![docs](https://comark-ui.onmax.me/badge.svg?label=docs&value=comark-ui.onmax.me)](https://comark-ui.onmax.me/qr/)

QR codes drawn as inline SVG while parsing, for opening a preview link on a phone. A [Comark](https://comark.dev) plugin for HTML, Vue, React, and Svelte.

```sh
pnpm add comark comark-qr
```

```ts
import { createHtmlRenderer } from "@comark/html";
import qr, { components } from "comark-qr/html";

const render = createHtmlRenderer({ plugins: [qr()], components });
```

```md
Open [pr-123.preview.example.com](https://pr-123.preview.example.com), or scan it on your phone:

:qr{value="https://pr-123.preview.example.com"}
```

The page needs no script. Codes are black on white in both color schemes; set `--cqr-size` to resize them.

The plugin adds every problem to `meta.issues`: a `:qr` with no `value`, one too long to encode, text in its brackets, and a prop it doesn't read. Each issue names its block and says how to fix it.

## Renderers

| Renderer | Import |
| --- | --- |
| `@comark/html` | `comark-qr/html`: the styles are inlined |
| `@comark/vue` | `comark-qr/vue` |
| `@comark/react` | `comark-qr/react` |
| `@comark/svelte` | `comark-qr/svelte` |

Each entry exports the parse plugin as `default` and the renderer's `components`. The Vue, React, and Svelte components add the styles when they mount; import `comark-qr/style.css` with your styles so a server-rendered page doesn't shift.
