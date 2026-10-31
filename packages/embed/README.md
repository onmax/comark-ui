# comark-embed

[![npm version](https://comark-ui.onmax.me/badge.svg?source=npm-version&package=comark-embed&icon=npm)](https://npmx.dev/package/comark-embed)
[![npm downloads](https://comark-ui.onmax.me/badge.svg?source=npm-downloads&package=comark-embed&period=month&icon=npm)](https://npmx.dev/package/comark-embed)
[![license](https://comark-ui.onmax.me/badge.svg?label=license&value=MIT)](https://npmx.dev/package/comark-embed)
[![docs](https://comark-ui.onmax.me/badge.svg?label=docs&value=comark-ui.onmax.me)](https://comark-ui.onmax.me/embed/)

Video, audio, and live code from a link: YouTube, Vimeo, Loom, Spotify, CodePen, StackBlitz, Figma, and X players, read from the link alone with no network fetch. A [Comark](https://comark.dev) plugin for HTML, Vue, React, and Svelte.

```sh
pnpm add comark comark-embed
```

```ts
import { createHtmlRenderer } from "@comark/html";
import embed, { components } from "comark-embed/html";

const render = createHtmlRenderer({ plugins: [embed()], components });
```

```md
::embed{url="https://youtu.be/KCrXgy8qtjM" title="Watch before standup: Vite in 100 Seconds" start=30}
::

::embed{url="https://comark.dev" title="Comark docs, for the duck report"}
::
```

`url` must be an `https://` link. `title` names the player and is the text of the link under it, which keeps the page readable in print, in feed readers, and where iframes are blocked. `start` is seconds into a YouTube or Vimeo video. Close the block with `::` on the next line.

| Provider | Links it reads |
| --- | --- |
| YouTube | `youtube.com/watch?v=`, `youtu.be/`, `/shorts/`, `/embed/`, `/live/`; plays from `youtube-nocookie.com` |
| Vimeo | `vimeo.com/<number>`, unlisted links with their hash; plays with `dnt=1` |
| Loom | `loom.com/share/<id>`, `/embed/<id>` |
| Spotify | `open.spotify.com/` track, album, playlist, episode, show, and artist |
| CodePen | `codepen.io/<user>/pen/<id>` (also `full`, `details`, or `embed`) |
| StackBlitz | `stackblitz.com/edit/<project>`, `stackblitz.com/github/<owner>/<repo>[/<path>]` |
| Figma | `figma.com/design`, `file`, `proto`, `board`, `slides`, and `deck` |
| X | `x.com/<user>/status/<id>`, `twitter.com`, and `mobile.` links; grows to the post's height |

Any other `https://` link renders as a card with its `title` and host. Cards don't fetch the page's title yet, so give each one a `title`.

The plugin adds every problem to `meta.issues`, so a host can reject a document before publishing it. A `url` that isn't `https://` renders nothing.

## Renderers

| Renderer | Import |
| --- | --- |
| `@comark/html` | `comark-embed/html`: the styles are inlined |
| `@comark/vue` | `comark-embed/vue` |
| `@comark/react` | `comark-embed/react` |
| `@comark/svelte` | `comark-embed/svelte` |

Each entry exports the parse plugin as `default` and the renderer's `components`. The Vue, React, and Svelte components add the styles when they mount; import `comark-embed/style.css` with your styles so a server-rendered page doesn't shift.

The styles follow shadcn/ui: they read its CSS variables, such as `--background` and `--border`, when the page has them, and use its neutral theme otherwise. Set the shared `--comark-*` tokens to theme every plugin at once; the rules sit in a `comark` CSS layer, so any plain rule of your own wins. Override `--ce-app-height` to change the height of CodePen, StackBlitz, and Figma; see the embed's [Theming page](https://comark-ui.onmax.me/embed/#theme).
