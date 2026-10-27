---
title: Badge
description: Badges for versions and statuses, written in Markdown.
keywords: label, tag, pill, status, version, deprecated, new, beta, shield, shields.io
tagline: A small label in one of Nuxt UI's seven colors, for a version, a status, or a deprecated API.
group: Docs blocks
icon: tag
blurb: Badges
credits: 'Syntax and colors from <a href="https://ui.nuxt.com/docs/typography">Nuxt UI</a>''s prose badge.'
---

::examples
:::example{label="Inline"}
```md
## useAsyncData :badge[deprecated]{color="warning"}

Use `useFetch` instead. :badge[v4]{color="info"} :badge[stable]{color="success"}
```
:::

:::example{label="Block"}
```md
::badge
**v4.0.0**
::
```
:::
::

## Features

- A prose badge is one `<span>`, written inline or as Nuxt UI's block `::badge`.
- Seven colors from Nuxt UI, each a tint with text in the color, so a badge reads on light and dark pages.
- Primary follows the page's shadcn/ui `--primary`, or the text color without one.
- On a Nuxt UI page, every color but neutral takes the app's `--ui-*` variable.
- Static SVG badges and live npm versions, downloads, and GitHub Actions status, with a [builder](/badges/) for sharing and export.
- No script: the components add the styles when they mount.

## Usage

Write a badge inline, with its text in brackets.

```md
:badge[deprecated]
```

### Block

Use the block `::badge` to write the badge's content inside it, as Nuxt UI does. Its paragraph is unwrapped, so it renders as one badge.

::example
```md
::badge
**v4.0.0**
::
```
::

### Color

Use the `color` prop to change the badge's color. It defaults to `primary`.

::example
```md
:badge[primary] :badge[secondary]{color="secondary"} :badge[success]{color="success"} :badge[info]{color="info"} :badge[warning]{color="warning"} :badge[error]{color="error"} :badge[neutral]{color="neutral"}
```
::

> [!NOTE]
> Nuxt UI's prose badge is always primary. `color` is this plugin's own, and Nuxt UI ignores it.

### Label

Use the `label` prop to draw the left side of a self-contained SVG badge. Its text can also come from the brackets. Static images are embedded in the document and need no server.

::example
```md
:badge[Comark UI]{label="built with" icon="package" color="#15803d"}
```
::

### Value

Use the `value` prop to set a static image's text without brackets.

```md
:badge{label="release" value="ready"}
```

### Source

Use `source` to show live data. npm sources need `package`; GitHub Actions needs a public `repository` and a workflow filename, with an optional `branch` filter. Without `branch`, GitHub returns the latest finished run across branches. Parsing fetches the data and draws it into the document like a static image, so a page loads no badge; it shows the data as of the build. When the data is unavailable, or with `download: false`, the badge loads from the hosted endpoint instead and stays current.

```md
:badge{source="npm-version" package="comark-ui"}
:badge{source="npm-downloads" package="comark-ui" period="month"}
:badge{source="github-actions" repository="onmax/comark-ui" workflow="ci.yml" branch="main"}
```

### Package

Use the `package` prop to choose the public npm package. Scoped names work too.

```md
:badge{source="npm-version" package="@comark/html"}
```

### Period

Use the `period` prop to choose the downloads window.

```md
:badge{source="npm-downloads" package="comark-ui" period="week"}
```

### Repository

Use the `repository` prop to choose a public GitHub repository as `owner/repo`.

```md
:badge{source="github-actions" repository="onmax/comark-ui" workflow="ci.yaml"}
```

### Workflow

Use the `workflow` prop to choose the workflow's YAML filename.

```md
:badge{source="github-actions" repository="onmax/comark-ui" workflow="release.yaml"}
```

### Branch

Use the `branch` prop to filter workflow runs to one branch. Without it, the badge shows the latest finished run across branches. A run still in progress never shows; the badge keeps the last result until it finishes.

```md
:badge{source="github-actions" repository="onmax/comark-ui" workflow="ci.yaml" branch="main"}
```

### Icon

Use the `icon` prop to add a built-in symbol, or `none` to remove it.

::example
```md
:badge[ready]{label="release" icon="check"}
```
::

### Label color

Use the `labelColor` prop to change the label background in subtle and solid styles. Image colors accept semantic names or six-digit hex values and do not inherit CSS tokens. CI chooses the value's color from its status.

::example
```md
:badge[ready]{label="release" color="success" labelColor="#262626"}
```
::

### Style

Use the `style` prop to choose shadcn outlines, subtle tints, or solid backgrounds. shadcn is the default. Solid badges choose black or white text for contrast.

::example
```md
:badge[ready]{label="release" style="solid" color="success"}
```
::

### Theme

Images follow the reader's light or dark theme by default, on GitHub too: the SVG carries both palettes and picks one from the page around it. Use the `theme` prop to lock an image to `light` or `dark`.

::example
```md
:badge[ready]{label="release" theme="dark" color="success"}
```
::

## Examples

### Badge in a heading

A badge in a heading sits on the heading's line, a little smaller than its text.

::example
```md
### refresh() :badge[new]{color="success"}
```
::

The heading's `id` takes the badge's words too, as Comark builds ids from all of a heading's text. `## useFetch :badge[deprecated]` links as `#usefetch-deprecated`.

### Build a README badge

Open the [badge builder](/badges/), choose Custom, npm version, Downloads, GitHub Actions, License, or Docs, and edit the options. Copy Markdown for a README, Comark for a document, or the image URL. Copy builder link preserves the configuration and export format in the URL. Download SVG saves the current result as a snapshot.

The hosted endpoint accepts the same image options as query parameters:

```text
https://comark-ui.onmax.me/badge.svg?label=built%20with&value=Comark%20UI&icon=package
https://comark-ui.onmax.me/badge.svg?source=npm-version&package=comark-ui
```

### Host the endpoint

Use `createBadgeHandler()` from `comark-badge/server` in a server or Worker. Keep one handler per process so requests share its bounded cache. In a Worker, pass a `cache` from the Cache API so every instance in a location shares the data, a GitHub `token` so workflow badges don't share the IP's limit of 60 requests an hour, and the request's context so data refreshes after the response. It also accepts `fetch` and `now` functions for testing.

```ts
import { createBadgeHandler } from "comark-badge/server";

let badges: ReturnType<typeof createBadgeHandler> | undefined;
export default {
  async fetch(request: Request, env: { GITHUB_TOKEN?: string }, context: ExecutionContext) {
    badges ??= createBadgeHandler({ token: env.GITHUB_TOKEN, cache: await caches.open("badges") });
    return badges(request, context);
  },
};
```

The handler accepts GET and HEAD, rejects malformed options with HTTP 400, and fetches only public npm and GitHub APIs. The token, which needs no scopes, goes only to GitHub. Authenticated workflow results are displayed and cached only when GitHub explicitly marks the run’s repository as public; private or unknown visibility returns `unavailable`, even with a broader token. It limits concurrent upstream requests to 16, response bodies to 64 KiB, requests to five seconds, and its process cache to 256 entries.

| Source | Cache lifetime |
| --- | --- |
| Static | One day |
| npm version | Five minutes |
| npm downloads | One hour |
| GitHub Actions | One minute |
| Unavailable upstream | 30 seconds |

Data is kept apart from the badge's look, so every style of one package shares it. Once its lifetime ends, the handler answers with the last value it has and refreshes it in the background; if the refresh fails, it keeps that value for up to a day and tries again 30 seconds later. Without one, a missing package, missing workflow, no runs, rate limit, or failed request displays `unavailable`, never a passing status. Image responses include `X-Badge-Status: ok` or `unavailable`. Responses allow `stale-while-revalidate` for a day, so browsers and image proxies show the last image while they fetch the next. An image reload checks the cache; there is no polling script.

## API

### Props

| Prop | Default | Description |
| --- | --- | --- |
| `color` | `primary` | `primary`, `secondary`, `success`, `info`, `warning`, `error`, or `neutral`. Images also accept six-digit hex. Prose badges fall back to primary on an unknown color. CI images use their status color. |
| `source` | `static` | Enables image mode: `static`, `npm-version`, `npm-downloads`, or `github-actions`. |
| `label` | Source name | Left-hand text, up to 80 characters. Empty by default for static images. |
| `value` | Bracket text | Static image text, up to 80 characters. Live sources resolve their own value. |
| `package` | — | npm package, including scoped names. |
| `period` | `month` | npm downloads for the last `day`, `week`, or `month`. |
| `repository` | — | Public GitHub repository as `owner/repo`. |
| `workflow` | — | Workflow filename, such as `ci.yml`. |
| `branch` | — | Optional workflow branch filter. |
| `icon` | Source icon | `none`, `package`, `npm`, `github`, `comark`, `shadcn`, or `check`. Brand marks are embedded in the SVG. |
| `labelColor` | `neutral` | Semantic or six-digit hex color for the label background in subtle and solid styles. |
| `style` | `shadcn` | `shadcn`, `subtle`, or `solid`. shadcn uses a neutral outline and text, with a dot in the value's color unless it is primary, secondary, or neutral. Solid automatically chooses black or white text for contrast. |
| `theme` | `auto` | `auto` follows the page's light or dark theme; `light` or `dark` locks the image to one. |

### Options

In `comarkUi()`, `badge: false` turns it off, and `badge: { endpoint, download }` configures live images. Standalone, pass the same options to `badge({ endpoint, download })`.

| Option | Default | Description |
| --- | --- | --- |
| `endpoint` | `https://comark-ui.onmax.me/badge.svg` | HTTPS image endpoint without credentials. Applies only to live sources. |
| `download` | `true` | Fetches live data while parsing and draws it into the document. Each source's data is kept for its cache lifetime below, once per process. `false` links live badges to `endpoint`. |

### Functions

`comark-badge/svg` exports `readBadge(options)`, returning `{ ok, value }` or `{ ok, error, field }`; `badgeSvg(image)` renders resolved text as SVG; `badgeParams(spec)` writes canonical query parameters; `badgeIcon(name)` renders a built-in logo or symbol for option controls. This entry has no framework or server dependency. `comark-badge/server` exports `createBadgeHandler(options?)` separately.

### Your own renderer

The parse plugin replaces each badge's attributes with its `color`, `primary` unless it set a known one, and keeps only its content:

```json
["badge", { "color": "warning" }, "deprecated"]
```

`colors`, exported from every renderer entry, lists the seven semantic colors. Image mode replaces the attributes with `src`, a data URI or the endpoint's URL, and `label`, with no children; render an image with `label` as its alt text.

### Issues

The plugin adds every problem to `meta.issues`, as [Validation](/guide/validation/) describes:

- A `color` it doesn't know. The badge shows as primary, and the issue lists the colors it knows.
- A prop it doesn't read.
- An empty prose badge.
- Invalid image options, reported under `comark/badge/invalid-image`. The content stays as a neutral prose badge.

Each issue names its badge by its number and text, and says how to fix it. Each one has its own rule in [Doctor](/doctor/).

### Package

comark-ui brings `comark-badge` and registers it. To use it alone, install it:

```sh
pnpm add comark @comark/html comark-badge
```

Register the plugin and pass the renderer's `components`:

```ts
import { createHtmlRenderer } from "@comark/html";
import badge, { components } from "comark-badge/html";

const render = createHtmlRenderer({ plugins: [badge()], components });
```

For Vue, React, or Svelte, import from `comark-badge/vue`, `comark-badge/react`, or `comark-badge/svelte`. The components add the styles when they mount. When you render on a server, import `comark-badge/style.css` with your own styles so the page doesn't shift. [Renderers](/guide/renderers/) covers using it with other plugins.

## Theme

Prose badges follow the shared tokens in [Theming](/guide/theming/), and a variable per color. The rules sit in a `comark` CSS layer, so any plain rule of your own wins.

### Shared tokens

| Token | Used for |
| --- | --- |
| `--comark-foreground` | Mixed into the text, so it stays readable |
| `--comark-muted` | Neutral and secondary badges |
| `--comark-radius` | Corners |
| `--comark-font` | Text |

### Variables

Each color reads Nuxt UI's variable first, then its own default. Set one on `.cb` to change it:

| Variable | Default |
| --- | --- |
| `--cb-primary` | `--ui-primary`, else shadcn/ui's `--primary`, else `--comark-foreground` |
| `--cb-secondary` | `--ui-secondary`, else `--comark-muted` |
| `--cb-success` | `--ui-success`, else `#16a34a` (`#4ade80` in dark mode) |
| `--cb-info` | `--ui-info`, else `#2563eb` (`#60a5fa` in dark mode) |
| `--cb-warning` | `--ui-warning`, else `#ca8a04` (`#facc15` in dark mode) |
| `--cb-error` | `--ui-error`, else shadcn/ui's `--destructive`, else `#dc2626` (`#f87171` in dark mode) |
| `--cb-neutral` | `--comark-muted` |

Primary's default matches the page's brand color, or stays neutral without one.

### Classes and attributes

| Selector | Is |
| --- | --- |
| `.cb` | A badge, a `<span>` |
| `.cb-image` | A static or hosted badge image |
| `[data-color]` | The badge's color, on `.cb` |
