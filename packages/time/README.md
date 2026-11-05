# comark-time

[![npm version](https://comark-ui.onmax.me/badge.svg?source=npm-version&package=comark-time&icon=npm)](https://npmx.dev/package/comark-time)
[![npm downloads](https://comark-ui.onmax.me/badge.svg?source=npm-downloads&package=comark-time&period=month&icon=npm)](https://npmx.dev/package/comark-time)
[![license](https://comark-ui.onmax.me/badge.svg?label=license&value=MIT)](https://npmx.dev/package/comark-time)
[![docs](https://comark-ui.onmax.me/badge.svg?label=docs&value=comark-ui.onmax.me)](https://comark-ui.onmax.me/time/)

Dates as relative time: "today", "2 days ago", "in 3 weeks". Past a threshold, 4 weeks by default, the text becomes a date, and hover or focus opens a tooltip with the full date and time. A [Comark](https://comark.dev) plugin for HTML, Vue, React, and Svelte.

```sh
pnpm add comark comark-time
```

```ts
import { createHtmlRenderer } from "@comark/html";
import time, { components } from "comark-time/html";

const render = createHtmlRenderer({ plugins: [time()], components });
```

```md
Opened :time[2026-11-02], last touched :time[2026-11-04T11:59:56Z], due :time[2026-11-25].

The first sighting was :time[2026-09-30]{threshold="8w"}.
```

`:time[2026-11-02]` reads "2 days ago" and opens "Mon, Nov 2, 2026" in a tooltip. A date alone counts whole days from today; with a time of day, it counts down to the second. The plugin works out the words, the date, and the tooltip while parsing, so it needs no script, and every `:time` in a document is measured from one `now`. Pass `now` to pin it, `locale` and `timeZone` to set the words and the day, and `threshold` to move the switch to a date or write `threshold="none"` to keep a date relative.

> [!NOTE]
> Rendered HTML keeps the words it was parsed with. Re-render cached pages, or render in the reader's browser with Vue, React, or Svelte.

The plugin adds every problem to `meta.issues`, so a host can reject a document before publishing it: a `:time` with no date, a date that isn't ISO, a `threshold` that isn't a number and a unit, and a prop it doesn't read. Each issue names its block and says how to fix it.

## Renderers

| Renderer | Import |
| --- | --- |
| `@comark/html` | `comark-time/html`: the styles are inlined |
| `@comark/vue` | `comark-time/vue` |
| `@comark/react` | `comark-time/react` |
| `@comark/svelte` | `comark-time/svelte` |

Each entry exports the parse plugin as `default` and the renderer's `components`. The Vue, React, and Svelte components add the styles when they mount; import `comark-time/style.css` with your styles so a server-rendered page doesn't shift. The styles read the shared `--comark-*` tokens and sit in a `comark` CSS layer, so any plain rule of your own wins.
