---
title: Badge
description: Badges for versions and statuses, written in Markdown.
keywords: label, tag, pill, status, version, deprecated, new, beta, shield, shields.io
tagline: Mark an API deprecated, a feature new, or a release by its version, in one of Nuxt UI's seven colors.
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

A badge is a `<span>` in a tint of its color with text in the color, so it reads on light and dark pages. Primary follows the page's shadcn/ui `--primary`, or the text color without one, and on a Nuxt UI page every color takes the app's `--ui-*` variable.

## Usage

```md
:badge[deprecated]{color="warning"}

::badge
**v4.0.0**
::
```

Write a badge inline, with its text in brackets, or as Nuxt UI's block `::badge` with its content inside. A block badge's paragraph is unwrapped, so it renders as one badge.

| Prop | What it does |
| --- | --- |
| `color` | One of `primary`, the default, `secondary`, `success`, `info`, `warning`, `error`, and `neutral`. |

Nuxt UI's prose badge is always primary. The `color` prop is this plugin's own, and Nuxt UI ignores it.

### Issues

The plugin adds every problem to `meta.issues`, as [Validation](/guide/validation/) describes:

- A `color` it doesn't know. The badge shows as primary, and the issue lists the colors it knows.
- A prop it doesn't read.
- An empty badge.

Each issue names its badge by its text and says how to fix it. Each one has its own rule in [Doctor](/doctor/).

## Examples

### Badges in headings

A badge in a heading sits on the heading's line, a little smaller than its text. The heading's `id` takes the badge's words too, as Comark builds ids from all of a heading's text: `## useFetch :badge[deprecated]` links as `#usefetch-deprecated`.

::example
```md
### refresh() :badge[new]{color="success"}
```
::

## API

The plugin takes no options. In `comarkUi()`, `badge: false` turns it off.

### Your own renderer

The parse plugin replaces each badge's attributes with its `color`, `primary` unless it set a known one, and keeps only its content:

```json
["badge", { "color": "warning" }, "deprecated"]
```

`colors`, exported from every entry, lists the seven colors.

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

A badge is a `<span class="cb" data-color="...">`. Each color reads Nuxt UI's variable, such as `--ui-warning`, then its own default. Primary's default is shadcn/ui's `--primary`, then the foreground, so badges match the page's brand color or stay neutral without one. Secondary's is the muted text color, and error's is `--destructive`. Set `--cb-primary`, `--cb-secondary`, `--cb-success`, `--cb-info`, `--cb-warning`, `--cb-error`, or `--cb-neutral` on `.cb` to change one. Badges also read these [shared tokens](/guide/theming/):

| Token | Used for |
| --- | --- |
| `--comark-foreground` | Mixed into the text, so it stays readable |
| `--comark-muted` | Neutral badges |
| `--comark-radius` | Corners |
| `--comark-font` | Text |

The rules sit in a `comark` CSS layer, so any plain rule of your own wins.
