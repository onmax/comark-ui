# comark-diagrams

[![npm version](https://comark-ui.onmax.me/badge.svg?source=npm-version&package=comark-diagrams&icon=npm)](https://npmx.dev/package/comark-diagrams)
[![npm downloads](https://comark-ui.onmax.me/badge.svg?source=npm-downloads&package=comark-diagrams&period=month&icon=npm)](https://npmx.dev/package/comark-diagrams)
[![license](https://comark-ui.onmax.me/badge.svg?label=license&value=MIT)](https://npmx.dev/package/comark-diagrams)
[![docs](https://comark-ui.onmax.me/badge.svg?label=docs&value=comark-ui.onmax.me)](https://comark-ui.onmax.me/diagrams/)

PlantUML, Graphviz, D2, DBML, GoAT, and Svgbob diagrams drawn as inline SVG while parsing, through a [Kroki](https://kroki.io) server, with no script. A [Comark](https://comark.dev) plugin for HTML, Vue, React, and Svelte.

```sh
pnpm add comark comark-diagrams
```

```ts
import { createHtmlRenderer } from "@comark/html";
import diagrams, { components } from "comark-diagrams/html";

const render = createHtmlRenderer({ plugins: [diagrams()], components });
```

````md
```d2 [Login flow]
user -> api: POST /login
api -> db
```
````

` ```plantuml `, ` ```graphviz ` or ` ```dot `, ` ```d2 `, ` ```dbml `, and ` ```goat ` or ` ```svgbob ` fences become SVG; a title in brackets names the diagram and shows under it. Each source is drawn once per process.

**Each diagram's source is sent to the Kroki server**, `https://kroki.io` by default. To keep sources private, run your own with `docker run -d -p 8000:8000 yuzutech/kroki` and pass `server: "http://localhost:8000"`. `draw: false` sends nothing and leaves the fences as code.

The SVG is sanitized: scripts, event handlers, `foreignObject`, animations, links that aren't to the web or within the drawing, and `@import` are dropped. A diagram that can't be drawn stays code, and the plugin adds a sentence to `meta.issues` with the tool's error or why the server couldn't be reached.

## Renderers

| Renderer | Import |
| --- | --- |
| `@comark/html` | `comark-diagrams/html`: the styles are inlined once per document |
| `@comark/vue` | `comark-diagrams/vue` |
| `@comark/react` | `comark-diagrams/react` |
| `@comark/svelte` | `comark-diagrams/svelte` |

Each entry exports the parse plugin as `default` and the renderer's `components`. The Vue, React, and Svelte components add the styles when they mount; import `comark-diagrams/style.css` with your styles so a server-rendered page doesn't shift. The styles read the shared `--comark-*` tokens and sit in a `comark` CSS layer, so any plain rule of your own wins.
