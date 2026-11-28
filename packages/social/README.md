# comark-social

[![npm version](https://comark-ui.onmax.me/badge.svg?source=npm-version&package=comark-social&icon=npm)](https://npmx.dev/package/comark-social)
[![npm downloads](https://comark-ui.onmax.me/badge.svg?source=npm-downloads&package=comark-social&period=month&icon=npm)](https://npmx.dev/package/comark-social)
[![license](https://comark-ui.onmax.me/badge.svg?label=license&value=MIT)](https://npmx.dev/package/comark-social)
[![docs](https://comark-ui.onmax.me/badge.svg?label=docs&value=comark-ui.onmax.me)](https://comark-ui.onmax.me/social)

Posts from X, Bluesky, Mastodon, Threads, LinkedIn, or any site as static cards: the author, the text, the pictures, a quoted post, and the counts in the platform's order, with its logo. A [Comark](https://comark.dev) plugin for HTML, Vue, React, and Svelte.

```sh
pnpm add comark comark-social
```

```ts
import { createHtmlRenderer } from "@comark/html";
import social, { components } from "comark-social/html";

const render = createHtmlRenderer({ plugins: [social()], components });
```

Write the post's props and its text. Images in a paragraph of their own are the pictures, and a `:::post` inside is the post it quotes:

```md
::post{url="https://x.com/jack/status/20" author="jack" handle="@jack" time="2006-03-21T20:50:14Z" replies="19K" reposts="122K" likes="324.6K"}
just setting up my twttr
::
```

Posts that reply to each other go in a `::thread`, one card with a rail between them and the last post larger:

```md
::thread
:::post{platform="x" author="jack" handle="jack" likes="40"}
a thread on twttr
:::

:::post{platform="x" author="jack" handle="jack" likes="12" views="9.1K"}
it's getting faster
:::
::
```

The platform comes from `url`, or from `platform` (`x`, `bluesky`, `mastodon`, `threads`, `linkedin`, or `generic`). The card has no iframe and no script, and the page asks no one for anything but the pictures.

With `social({ fetch: true })`, X and Bluesky posts are filled from their public APIs while parsing, and pictures from their known image origins are inlined. What's written wins, and a `::thread{url}` with no posts is fetched up to its root, five posts at most. For Mastodon or other image origins, provide a trusted `request` transport that enforces egress policy on every API, image, and redirect request. Do not use an unrestricted transport for untrusted content. `fetchPost(url, { request })` returns the post data for a script of your own. Static rendering needs no transport.

The plugin adds every problem to `meta.issues`, so a host can reject a document before publishing it. Each issue names the block and says how to fix it.

## Renderers

| Renderer | Import |
| --- | --- |
| `@comark/html` | `comark-social/html`: the styles are inlined |
| `@comark/vue` | `comark-social/vue` |
| `@comark/react` | `comark-social/react` |
| `@comark/svelte` | `comark-social/svelte` |

Each entry exports the parse plugin as `default` and the renderer's `components`. The Vue, React, and Svelte components add the styles when they mount; import `comark-social/style.css` with your styles so a server-rendered page doesn't shift. The styles read the shared `--comark-*` tokens and sit in a `comark` CSS layer, so any plain rule of your own wins.
