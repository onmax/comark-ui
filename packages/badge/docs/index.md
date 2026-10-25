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

- A badge is one `<span>`, written inline or as Nuxt UI's block `::badge`.
- Seven colors from Nuxt UI, each a tint with text in the color, so a badge reads on light and dark pages.
- Primary follows the page's shadcn/ui `--primary`, or the text color without one.
- On a Nuxt UI page, every color but neutral takes the app's `--ui-*` variable.
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

## Examples

### Badge in a heading

A badge in a heading sits on the heading's line, a little smaller than its text.

::example
```md
### refresh() :badge[new]{color="success"}
```
::

The heading's `id` takes the badge's words too, as Comark builds ids from all of a heading's text. `## useFetch :badge[deprecated]` links as `#usefetch-deprecated`.

## API

### Props

| Prop | Default | Description |
| --- | --- | --- |
| `color` | `primary` | The badge's color: `primary`, `secondary`, `success`, `info`, `warning`, `error`, or `neutral`. An unknown color shows as primary and adds an issue. |

### Options

The plugin takes no options. In `comarkUi()`, `badge: false` turns it off.

### Your own renderer

The parse plugin replaces each badge's attributes with its `color`, `primary` unless it set a known one, and keeps only its content:

```json
["badge", { "color": "warning" }, "deprecated"]
```

`colors`, exported from every entry, lists the seven colors.

### Issues

The plugin adds every problem to `meta.issues`, as [Validation](/guide/validation/) describes:

- A `color` it doesn't know. The badge shows as primary, and the issue lists the colors it knows.
- A prop it doesn't read.
- An empty badge.

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

Badges follow the shared tokens in [Theming](/guide/theming/), and a variable per color. The rules sit in a `comark` CSS layer, so any plain rule of your own wins.

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
| `[data-color]` | The badge's color, on `.cb` |
