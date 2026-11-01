---
title: Badge
description: Badges for versions and statuses, written in Markdown.
keywords: label, tag, pill, status, version, deprecated, new, beta, shield, shields.io
tagline: A small label in one of Nuxt UI's seven colors, for a version, a status, or a deprecated API.
group: Docs blocks
icon: tag
blurb: Badges
credits: 'Syntax and colors from <a href="https://ui.nuxt.com/docs/typography">Nuxt UI</a>''s prose badge. npmx and Nuxt marks from <a href="https://github.com/npmx-dev/npmx.dev">npmx</a> and <a href="https://github.com/nuxt/nuxt.com">Nuxt</a>, under MIT licenses. Flat and For the badge inspired by <a href="https://shields.io/">Shields.io</a>.'
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
- Primary follows the shared `--comark-primary`, which is the page's Nuxt UI or shadcn/ui primary, or else the text color.
- On a Nuxt UI page, every color but neutral takes the app's `--ui-*` variable.
- SVG image badges, static or with live npm versions, downloads, and GitHub Actions status, and a [builder](/badges/) to share and export them.
- No script. The components add the styles when they mount.

## Usage

Write a badge inline, with its text in brackets.

```md
:badge[deprecated]
```

### Block

Use the block `::badge` to write the content inside it, as Nuxt UI does. The plugin unwraps its paragraph, so it renders as one badge.

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

Use the `label` prop to draw a self-contained SVG badge, with the label on its left and the bracket text on its right. The document embeds static images, so they need no server.

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

Use the `source` prop to show live data. npm sources need `package`. GitHub Actions needs a public `repository` and a `workflow` filename, and takes an optional `branch`. Parsing fetches the data and draws it into the document like a static image, so the page shows the data as of the build and loads no badge. When the data is unavailable, or with `download: false`, the badge loads from the hosted endpoint instead and stays current.

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

Use the `branch` prop to filter workflow runs to one branch. Without it, the badge shows the latest finished run across branches. A run in progress never shows. The badge keeps the last result until it finishes.

```md
:badge{source="github-actions" repository="onmax/comark-ui" workflow="ci.yaml" branch="main"}
```

### Icon

Use the `icon` prop to add a built-in symbol or logo, or `none` to remove it. By default, npm sources use the npm, npmx, or Nuxt logo to match the preset, and GitHub Actions uses GitHub in every preset. An explicit icon overrides the default.

::example
```md
:badge[ready]{label="release" icon="check"}
```
::

### Label color

Use the `labelColor` prop to change the label's background in the default preset's subtle and solid styles. Image colors take a semantic name or a six-digit hex value, and don't inherit CSS tokens. A CI badge colors its value by status.

::example
```md
:badge[ready]{label="release" color="success" labelColor="#262626"}
```
::

### Style

Use the `style` prop to choose shadcn outlines, subtle tints, or solid backgrounds, in the default preset only. shadcn is the default. Solid badges pick black or white text for contrast.

::example
```md
:badge[ready]{label="release" style="solid" color="success"}
```
::

### Preset

Use the `preset` prop to choose `default`, `npmx`, `nuxt`, `flat`, or `for-the-badge`. npmx has monospace text and a colored slash, and Nuxt a navy label and a green value block. Flat is the compact 20px shape from Shields.io, and For the badge a 28px block with uppercase text. Every preset takes CI status colors and a custom color. Presets other than default ignore `style` and `labelColor`.

::example
```md
:badge[v1.2.3]{label="npm" preset="npmx" icon="npmx"}
:badge[v1.2.3]{label="npm" preset="nuxt" icon="nuxt"}
:badge[v1.2.3]{label="npm" preset="flat" icon="npm"}
:badge[v1.2.3]{label="npm" preset="for-the-badge" icon="npm"}
```
::

Live npm badges take the npmx or Nuxt logo in those presets, and npm's in the others:

```md
:badge{source="npm-version" package="comark-ui" preset="npmx"}
:badge{source="npm-downloads" package="@nuxtjs/better-auth" preset="nuxt"}
```

### Theme

Use the `theme` prop to lock an image to `light` or `dark`. By default the SVG carries both palettes and follows the reader's theme, on GitHub too. Nuxt, Flat, and For the badge keep their palettes in both modes, with a faint outline in dark mode.

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

The heading's `id` includes the badge's words, since Comark builds ids from all of a heading's text. `## useFetch :badge[deprecated]` links as `#usefetch-deprecated`.

### Build a README badge

Open the [badge builder](/badges/), pick Custom, npm version, Downloads, GitHub Actions, License, or Docs, and edit the options. Pick a preset from the Appearance swatches, then a color scheme and logo. Copy Markdown for a README, Comark for a document, or the image URL. Copy builder link keeps the setup and export format in the URL, and Download SVG saves a snapshot.

The hosted endpoint takes the same image options as query parameters:

```text
https://comark-ui.onmax.me/badge.svg?label=built%20with&value=Comark%20UI&icon=package
https://comark-ui.onmax.me/badge.svg?source=npm-version&package=comark-ui&preset=npmx
```

### Host the endpoint

Use `createBadgeHandler()` from `comark-badge/server` in a server or Worker, and reuse one handler for every request. In a Worker, pass:

- a `cache` from the Cache API, so instances in a location share the data
- a GitHub `token`, so workflow badges don't share the IP's limit of 60 requests an hour
- the request's context, so data refreshes after the response

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

The handler takes GET and HEAD, answers malformed options with HTTP 400, and calls only public npm and GitHub APIs. The token needs no scopes and goes only to GitHub. A workflow badge shows only when GitHub marks the repository public. A private or unknown repository returns `unavailable`, even with a broader token.

| Source | Cache lifetime |
| --- | --- |
| Static | One day |
| npm version | Five minutes |
| npm downloads | One hour |
| GitHub Actions | One minute |
| Unavailable upstream | 30 seconds |

When a lifetime ends, the handler serves the last value and refreshes it in the background. With no earlier value, a missing package or workflow, no runs, a rate limit, or a failed request shows `unavailable`, never a passing status. Browsers and image proxies show the last image while they fetch the next.

### Serve badges behind Cloudflare

README image proxies and scripts can't solve browser challenges, so Cloudflare's Browser Integrity Check can reject them with HTTP 403 and error code 1010 before they reach the handler. Allow anonymous GET and HEAD requests to your badge endpoint.

If Security Events names Browser Integrity Check as the cause, add a Configuration Rule for the badge's hostname, path, and methods. For the hosted endpoint, it's this rule in the `http_config_settings` phase:

```json
{
  "description": "Allow badge image clients without Browser Integrity Check",
  "expression": "http.host eq \"comark-ui.onmax.me\" and http.request.uri.path eq \"/badge.svg\" and http.request.method in {\"GET\" \"HEAD\"}",
  "action": "set_config",
  "action_parameters": { "bic": false },
  "enabled": true
}
```

When self-hosting, use your own hostname and path. The rule turns off Browser Integrity Check for matching requests and changes nothing else. Wrangler doesn't apply zone Configuration Rules, so manage it in Cloudflare.

Test from the client that failed. A badge request should return HTTP 200 with `Content-Type: image/svg+xml`. If a 403 remains, Security Events names the feature that blocks it. No change to the handler fixes a rejection at Cloudflare's edge.

## API

### Props

| Prop | Default | Description |
| --- | --- | --- |
| `color` | `primary` | `primary`, `secondary`, `success`, `info`, `warning`, `error`, or `neutral`. Images also take six-digit hex. Prose badges fall back to primary on an unknown color. CI images use their status color. |
| `source` | `static` | Enables image mode: `static`, `npm-version`, `npm-downloads`, or `github-actions`. |
| `label` | Source name | Left-hand text, up to 80 characters. Empty by default for static images. |
| `value` | Bracket text | Static image text, up to 80 characters. Live sources resolve their own value. |
| `package` | — | npm package, including scoped names. |
| `period` | `month` | npm downloads for the last `day`, `week`, or `month`. |
| `repository` | — | Public GitHub repository as `owner/repo`. |
| `workflow` | — | Workflow filename, such as `ci.yml`. |
| `branch` | — | Optional workflow branch filter. |
| `icon` | Source icon | `none`, `package`, `npm`, `npmx`, `nuxt`, `github`, `comark`, `shadcn`, or `check`. npm sources default to the preset's logo, and GitHub Actions to GitHub. The SVG embeds brand marks. |
| `labelColor` | `neutral` | Semantic or six-digit hex color for the label background in the default preset's subtle and solid styles. |
| `preset` | `default` | `default`, `npmx`, `nuxt`, `flat`, or `for-the-badge`. All but default ignore `style` and `labelColor`. |
| `style` | `shadcn` | In the default preset: `shadcn`, `subtle`, or `solid`. shadcn uses a neutral outline and text, with a dot in the value's color unless it is primary, secondary, or neutral. Solid picks black or white text for contrast. |
| `theme` | `auto` | `auto` follows the page's light or dark theme. `light` or `dark` locks the image to one. |

### Options

In `comarkUi()`, `badge: false` turns it off, and `badge: { endpoint, download }` configures live images. Standalone, pass the same options to `badge({ endpoint, download })`.

| Option | Default | Description |
| --- | --- | --- |
| `endpoint` | `https://comark-ui.onmax.me/badge.svg` | HTTPS image endpoint without credentials. Applies only to live sources. |
| `download` | `true` | Fetches live data while parsing and draws it into the document. `false` links live badges to `endpoint`. |

### Functions

`comark-badge/svg` has no framework or server dependency. It exports:

- `readBadge(options)` returns `{ ok, value }` or `{ ok, error, field }`.
- `badgeSvg(image)` renders resolved text as SVG.
- `badgeParams(spec)` writes canonical query parameters.
- `badgeIcon(name)` renders a built-in logo or symbol for option controls.
- `badgePresets` lists the presets.
- `badgeDefaultIcon({ source, preset })` returns the default icon for a source and preset.

`comark-badge/server` exports `createBadgeHandler(options?)`.

### Your own renderer

The parse plugin replaces each badge's attributes with its `color`, `primary` unless it set a known one, and keeps only its content:

```json
["badge", { "color": "warning" }, "deprecated"]
```

Every renderer entry exports `colors`, the seven semantic colors. An image badge's attributes become `src`, a data URI or the endpoint's URL, and `label`, with no children. Render it as an image with `label` as its alt text.

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

For Vue, React, or Svelte, import from `comark-badge/vue`, `comark-badge/react`, or `comark-badge/svelte`. When you render on a server, import `comark-badge/style.css` with your own styles so the page doesn't shift. [Renderers](/guide/renderers/) covers using it with other plugins.

## Theme

Prose badges follow the shared tokens in [Theming](/guide/theming/), and a variable per color. The rules sit in a `comark` CSS layer, so any plain rule of your own wins.

### Shared tokens

| Token | Used for |
| --- | --- |
| `--comark-foreground` | Mixed into the text, so it stays readable |
| `--comark-primary` | Primary badges |
| `--comark-secondary` | Secondary badges |
| `--comark-muted` | Neutral badges |
| `--comark-radius` | Corners |
| `--comark-font` | Text |

### Variables

Each color defaults to a shared token. Set one on `.cb` to change badges alone:

| Variable | Default |
| --- | --- |
| `--cb-primary` | `--comark-primary` |
| `--cb-secondary` | `--comark-secondary` |
| `--cb-success` | `--comark-success` |
| `--cb-info` | `--comark-info` |
| `--cb-warning` | `--comark-warning` |
| `--cb-error` | `--comark-danger` |
| `--cb-neutral` | `--comark-muted` |

### Classes and attributes

| Selector | Is |
| --- | --- |
| `.cb` | A badge, a `<span>` |
| `.cb-image` | A static or hosted badge image |
| `[data-color]` | The badge's color, on `.cb` |
