# comark-badge

[![npm version](https://comark-ui.onmax.me/badge.svg?source=npm-version&package=comark-badge&icon=npm)](https://npmx.dev/package/comark-badge)
[![npm downloads](https://comark-ui.onmax.me/badge.svg?source=npm-downloads&package=comark-badge&period=month&icon=npm)](https://npmx.dev/package/comark-badge)
[![license](https://comark-ui.onmax.me/badge.svg?label=license&value=MIT)](https://npmx.dev/package/comark-badge)
[![docs](https://comark-ui.onmax.me/badge.svg?label=docs&value=comark-ui.onmax.me)](https://comark-ui.onmax.me/badge/)

Badges for versions and statuses, inline as `:badge[deprecated]{color="warning"}` or as Nuxt UI's block `::badge`, in Nuxt UI's seven colors. A [Comark](https://comark.dev) plugin for HTML, Vue, React, and Svelte.

```sh
pnpm add comark comark-badge
```

```ts
import { createHtmlRenderer } from "@comark/html";
import badge, { components } from "comark-badge/html";

const render = createHtmlRenderer({ plugins: [badge()], components });
```

```md
## useAsyncData :badge[deprecated]{color="warning"}

::badge
**v4.0.0**
::
```

`color` is one of `primary`, the default, `secondary`, `success`, `info`, `warning`, `error`, and `neutral`. The plugin adds every problem to `meta.issues`, so a host can reject a document before publishing it: an unknown color, which shows as primary, and an empty badge. Each issue names its badge and says how to fix it.

## Renderers

| Renderer | Import |
| --- | --- |
| `@comark/html` | `comark-badge/html`: the styles are inlined |
| `@comark/vue` | `comark-badge/vue` |
| `@comark/react` | `comark-badge/react` |
| `@comark/svelte` | `comark-badge/svelte` |

Each entry exports the parse plugin as `default` and the renderer's `components`. The Vue, React, and Svelte components add the styles when they mount; import `comark-badge/style.css` with your styles so a server-rendered page doesn't shift.

Each color reads Nuxt UI's variable, such as `--ui-primary`, when the page has it, so badges match a Nuxt UI app. Otherwise primary follows shadcn/ui's `--primary`, or the text color, and error follows `--destructive`. Set `--cb-*` to change a color and the shared `--comark-*` tokens to theme every plugin at once. Any plain rule of your own wins.

## SVG badges and builder

Use the [builder](https://comark-ui.onmax.me/badges/) to preview, share, and export badges as SVG, Markdown, or Comark. Choose the default, npmx, Nuxt, flat, or for-the-badge preset, with automatic light/dark colors and built-in logos.

```md
:badge[Comark UI]{label="built with" icon="package" color="success"}
:badge{source="npm-version" package="comark-ui" preset="npmx"}
:badge{source="npm-downloads" package="@nuxtjs/better-auth" period="month" preset="nuxt"}
:badge{source="github-actions" repository="onmax/comark-ui" workflow="ci.yml"}
```

`preset="npmx"` uses monospace text and a colored slash; `preset="nuxt"` uses navy and green. npm sources pick the matching logo automatically. Set `icon="none"` to hide it or choose `npm`, `npmx`, `nuxt`, `github`, `comark`, `shadcn`, `package`, or `check`. `preset="flat"` draws a compact 20px badge; `preset="for-the-badge"` draws a larger 28px badge with uppercase text. The default preset keeps its existing `style` and `labelColor` options; other presets ignore them.

Static badges embed their SVG locally. Live badges fetch their data while parsing and embed it too, so a page loads no badge. With `download: false`, or when the data is unavailable, they load from `https://comark-ui.onmax.me/badge.svg`, configurable with `badge({ endpoint })` or `comarkUi({ badge: { endpoint } })`. Public npm and GitHub Actions data is cached; unavailable data displays `unavailable`. Downloads are snapshots.

`comark-badge/svg` exports the shared option reader and SVG generator. `comark-badge/server` exports `createBadgeHandler()` for hosting the GET/HEAD image endpoint. See [Badge](https://comark-ui.onmax.me/badge/) for options, caching, and deployment details.
