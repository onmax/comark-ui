# comark-cast

[![npm version](https://comark-ui.onmax.me/badge.svg?source=npm-version&package=comark-cast&icon=npm)](https://npmx.dev/package/comark-cast)
[![npm downloads](https://comark-ui.onmax.me/badge.svg?source=npm-downloads&package=comark-cast&period=month&icon=npm)](https://npmx.dev/package/comark-cast)
[![license](https://comark-ui.onmax.me/badge.svg?label=license&value=MIT)](https://npmx.dev/package/comark-cast)
[![docs](https://comark-ui.onmax.me/badge.svg?label=docs&value=comark-ui.onmax.me)](https://comark-ui.onmax.me/cast/)

Terminal recordings from [asciinema](https://asciinema.org) casts, shown as the terminal's final screen or its whole log in colored text, with no player and no script. A [Comark](https://comark.dev) plugin for HTML, Vue, React, and Svelte.

```sh
pnpm add comark comark-cast
```

```ts
import { createHtmlRenderer } from "@comark/html";
import cast, { components } from "comark-cast/html";

const render = createHtmlRenderer({ plugins: [cast({ root: "docs" })], components });
```

```md
::cast{src="test.cast" title="pnpm test"}
::

::cast{src="build.cast" mode="log"}
::
```

The plugin reads asciinema v2 and v3 casts, from `src` under `root` or from a code block inside the block, and replays their output through a small terminal: colors, cursor moves, erased lines, progress bars redrawn with `\r`, wide characters, and the alternate screen. `mode="log"` keeps the lines that scrolled off. Pass `read` to read files another way, such as in a browser.

The plugin adds every problem to `meta.issues`: no cast, a missing or unreadable file, one outside `root`, a header or event it can't read, a cast with no output, and an unknown `mode`. Each issue names its block and says how to fix it.

## Renderers

| Renderer | Import |
| --- | --- |
| `@comark/html` | `comark-cast/html`: the styles are inlined once per document |
| `@comark/vue` | `comark-cast/vue` |
| `@comark/react` | `comark-cast/react` |
| `@comark/svelte` | `comark-cast/svelte` |

Each entry exports the parse plugin as `default` and the renderer's `components`. The Vue, React, and Svelte components add the styles when they mount; import `comark-cast/style.css` with your styles so a server-rendered page doesn't shift.

The terminal is a window in the page's scheme, with a muted surface, a border, and three dots, and its 16 colors switch with the scheme. Override `--cca-background`, `--cca-foreground`, and `--cca-0` to `--cca-15` to change its colors; the frame follows the shared `--comark-*` tokens.
