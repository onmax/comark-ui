# comark-chips

[![npm version](https://npmx.dev/api/registry/badge/version/comark-chips)](https://npmx.dev/package/comark-chips)
[![npm downloads](https://npmx.dev/api/registry/badge/downloads-month/comark-chips)](https://npmx.dev/package/comark-chips)
[![install size](https://npmx.dev/api/registry/badge/size/comark-chips)](https://npmx.dev/package/comark-chips)
[![license](https://npmx.dev/api/registry/badge/license/comark-chips)](https://npmx.dev/package/comark-chips)
[![docs](https://img.shields.io/badge/docs-comark--ui.onmax.me-14b8a6?labelColor=0a0a0a)](https://comark-ui.onmax.me/chips/)

Links and `@user` mentions as chips with the site's favicon or the person's avatar, as on [antfu.me](https://antfu.me). A [Comark](https://comark.dev) plugin for HTML, Vue, React, and Svelte.

```sh
pnpm add comark comark-chips
```

```ts
import { createHtmlRenderer } from "@comark/html";
import chips, { components } from "comark-chips/html";

const render = createHtmlRenderer({ plugins: [chips()], components });
```

Write links and mentions as usual:

```md
Moves the build to [Vite](https://vite.dev). Reviewed by @antfu.
```

Every web link becomes a chip with its site's favicon, and every `@user` a chip with their GitHub avatar that links to their profile. A link into a GitHub account or repository shows the account's avatar, and a link into an X, Bluesky, YouTube, or GitLab account shows theirs through [unavatar.io](https://unavatar.io). Relative links, links around images, and links written as HTML stay plain.

The images are downloaded while parsing and inlined as data URIs, so the page asks no other site for them. They are kept in `node_modules/.cache/comark-chips` for a week, so the next build asks no one either. One that can't be downloaded stays a URL for the reader's browser to load. An avatar that answers with an HTTP error, such as an `@user` with no account, is reported in `meta.issues`.

## Props

| Prop | Does |
| --- | --- |
| `[Anthony](https://antfu.me){avatar="@antfu"}` | Uses that GitHub account's avatar |
| `[Sindre](https://sindresorhus.com){avatar="bluesky:sindresorhus.com"}` | Uses that account's avatar on any network [unavatar.io](https://unavatar.io/docs) knows |
| `[Nuxt](https://nuxt.com){avatar="https://…"}` | Uses this image |
| `[guide](https://vite.dev/guide/){chip=false}` | Keeps a plain link |
| `:chip[Comark]{href="https://comark.dev"}` | Writes a chip directly |

## Options

`chips({ download: false })` keeps the image URLs instead of downloading them; use it where parsing runs in a browser. `favicon: (host) => url` and `avatar: (login) => url` change where the images come from, such as `https://unavatar.io/github/${login}`. `cache: ".comark/chips"` keeps the images in a folder you can commit, and `cache: false` keeps them in memory only.

## Renderers

| Renderer | Import |
| --- | --- |
| `@comark/html` | `comark-chips/html`: the styles are inlined once per document |
| `@comark/vue` | `comark-chips/vue` |
| `@comark/react` | `comark-chips/react` |
| `@comark/svelte` | `comark-chips/svelte` |

Each entry exports the parse plugin as `default` and the renderer's `components`. The Vue, React, and Svelte components add the styles when they mount; import `comark-chips/style.css` with your styles so a server-rendered page doesn't shift.

## Customize

Chips follow shadcn/ui's Badge and the shared `--comark-*` tokens. A chip is an `a.cp` with `data-kind="favicon"` or `data-kind="avatar"`, holding an `img.cp-img`. The rules sit in a `comark` CSS layer, so any plain rule of your own wins. `--cp-background`, `--cp-ring`, `--cp-radius`, and the other `--cp-*` variables change the fill, the ring, and the corners; see the chips' [Theming page](https://comark-ui.onmax.me/chips/#theme).

Docs and live demos: [comark-ui.onmax.me/chips](https://comark-ui.onmax.me/chips/).
