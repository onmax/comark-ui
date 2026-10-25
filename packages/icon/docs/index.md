---
title: Icon
description: Iconify icons in Markdown, drawn as CSS in every renderer.
keywords: Iconify, Lucide, SVG icons, Heroicons, Material icons, Tabler, Phosphor, Simple Icons, Nuxt UI icons
tagline: An Iconify icon or an image of your own, drawn inline in the text as CSS with no script.
group: Review blocks
icon: shapes
blurb: Iconify icons in Markdown
---

::examples
:::example{label="Inline"}
```md
Merge the :icon{name="lucide:git-pull-request"} pull request once its :icon{name="lucide:circle-check"} checks pass.
```
:::

:::example{label="Logos"}
```md
Built with :icon{name="logos:vue"} Vue and :icon{name="logos:vitejs"} Vite, deployed to :icon{name="logos:cloudflare-icon"} Cloudflare.
```
:::
::

## Features

- `:icon` draws any of Iconify's 200,000 icons, or an image of your own.
- An icon in one color takes the color of the text around it and follows its theme. One with colors of its own, such as a logo, keeps them.
- The plugin resolves icons while parsing and writes them into the page as CSS images, so the page asks no server for them and they show without a script.
- Nuxt UI's spelling of a name works too, so Markdown written for Nuxt UI renders the same.
- The resolver is public, so other plugins take the same options and draw their icons with it. [comark-tabs](/tabs/#icon) uses it for tab icons.

## Usage

Use `:icon` with the icon's name.

::example
```md
Ship it :icon{name="lucide:rocket"}
```
::

### Name

Use the `name` prop to pick the icon. Write `set:name`, such as `lucide:apple`, or the URL of an image. Browse the sets at [icones.js.org](https://icones.js.org).

::example
```md
:icon{name="lucide:apple"} :icon{name="i-lucide-apple"} :icon{name="i-lucide:apple"}
```
::

Nuxt UI's `i-lucide-apple` and `i-lucide:apple` draw the same icon as `lucide:apple`. A name can be bound to the frontmatter, as `:icon{:name="frontmatter.icon"}`.

### Label

Use the `label` prop to tell screen readers what the icon means. Without one, the icon is decoration and they skip it.

```md
:icon{name="lucide:circle-check" label="Passed"}
```

Give a `label` when the icon carries meaning the text around it doesn't, such as a lone status icon. Leave it out when a word next to it says the same.

## Examples

### Build offline

With no options, the plugin fetches each icon from the [Iconify API](https://iconify.design/docs/api/) while parsing. It asks once per process, for a few icons per request. To build offline, or to keep the output from depending on Iconify, install the sets you use and pass them in `collections`:

```ts
import { icons as lucide } from "@iconify-json/lucide";
import icon from "comark-icon/html";

icon({ collections: { lucide }, fetch: false });
```

### Icons of your own

Use `collections` with SVG markup by name to draw icons from your own SVG files:

```ts
const brand = import.meta.glob("./icons/*.svg", { query: "?raw", import: "default", eager: true });

icon({
  collections: {
    brand: Object.fromEntries(
      Object.entries(brand).map(([path, svg]) => [path.split("/").pop()!.replace(".svg", ""), svg]),
    ),
  },
});
```

`:icon{name="brand:logo"}` then draws `icons/logo.svg`.

### Share options with other plugins

`createIcons()` makes one resolver with these options. Pass it to the plugin, and to other plugins that draw icons, so a page sets them once:

```ts
import icon, { createIcons } from "comark-icon/html";

const icons = createIcons({ collections: { lucide } });
const plugins = [icon(icons)];
```

`comarkUi()` does this for you: it makes one resolver from the `icon` options and shares it with cards, details, file trees, tabs, and code actions.

### Icons in another plugin

A plugin that draws icons, such as tab icons, takes an `Icons` from `createIcons()` and resolves every icon it needs in one call while parsing:

```ts
import { createIcons, describeIconProblem, iconProblemRule, type Icons } from "comark-icon";

const resolved = await icons.resolve(["lucide:apple", "logos:pnpm"]);
for (const [name, icon] of resolved) {
  if ("problem" in icon) {
    const issue = `Tab 1: ${describeIconProblem(name, icon)}`;
    issues.push(issue);
    issueRules[issue] = iconProblemRule(icon); // such as "comark/icon/unknown-icon"
  } else node[1].icon = icon; // { name, src, ratio, mask }
}
```

Put each sentence in `meta.issues` and its rule from `iconProblemRule()` in `meta.issueRules`, so comark-linter reports the problem under the same rule as an `:icon`'s.

Draw each icon in your renderers with this package's helpers, so the icons look and size the same as `:icon`. Use `iconHtml()` and `iconStyles(state)` from `comark-icon/html`, and the `Icon` component from `comark-icon/vue`, `/react`, and `/svelte`.

## API

### Props

| Prop | Default | Description |
| --- | --- | --- |
| `name` | — | Required. An icon as `set:name`, such as `lucide:apple`, Nuxt UI's `i-lucide-apple`, or the URL of an image. |
| `label` | — | What the icon means, for screen readers. Without one, the icon is decoration and they skip it. |

### Options

These options go under `icon` in `comarkUi()`, or to `icon()` and `createIcons()` when you use them alone.

| Option | Default | Description |
| --- | --- | --- |
| `collections` | — | Sets by prefix, used before the API. A set is an Iconify set from `@iconify-json/*`, or SVG markup by name, for icons of your own. |
| `fetch` | `true` | Fetches icons from the Iconify API. `false` resolves only `collections`; a URL asks an Iconify API of your own. |

### Functions

| Function | Returns | Description |
| --- | --- | --- |
| `createIcons(options)` | `Icons` | One resolver with these options, to share between plugins. Its `resolve(names)` maps each name to its icon or its problem, and never throws. |
| `describeIconProblem(name, problem)` | `string` | The sentence for an icon that can't be drawn, with the fix. |
| `iconProblemRule(problem)` | `string` | The comark-linter rule of an icon problem. |
| `iconHtml(icon, label?)` | `string` | An icon as HTML, from `comark-icon/html`. |
| `iconStyles(state)` | `string` | The icon styles as one `<style>`, once per render, from `comark-icon/html`. |

### Issues

The plugin checks every icon while parsing and adds the problems to `meta.issues`, as [Validation](/guide/validation/) describes. An icon it can't draw is left out of the page.

```txt
`:icon` 1 ("lucide:aple"): The `lucide` set has no icon `aple`. Find its name at https://icones.js.org/collection/lucide.
```

It reports:

- An icon without a `name`.
- A name that isn't `set:name` or a URL.
- A set or icon Iconify doesn't have.
- A request that failed.
- A prop `:icon` doesn't read.

Each one has its own rule in [Doctor](/doctor/). Rendering never throws.

### Package

comark-ui brings `comark-icon` and registers it. To use it alone, install it with Comark and a renderer:

```sh
pnpm add comark @comark/html comark-icon
```

Register the plugin and pass the renderer's `components`:

```ts
import { createHtmlRenderer } from "@comark/html";
import icon, { components } from "comark-icon/html";

const render = createHtmlRenderer({ plugins: [icon()], components });
```

For Vue, React, or Svelte, import from `comark-icon/vue`, `comark-icon/react`, or `comark-icon/svelte`. The `Icon` component adds the styles when it mounts. When you render on a server, import `comark-icon/style.css` with your own styles so the page doesn't shift. [Renderers](/guide/renderers/) covers using it with other plugins.

## Theme

An icon is a `.ci` the height of the text, `1em`, and as wide as its shape. The rules sit in a `comark` CSS layer, so any plain rule of your own wins.

### Variables

Icons don't read the [shared tokens](/guide/theming/). An icon in one color paints in `currentColor`, so it takes the color of the text around it. One with colors of its own, such as a logo, keeps them.

| Variable | Default | Used for |
| --- | --- | --- |
| `--comark-icon-size` | `1em` | The height of every icon, in text and in tabs. Its width follows its shape. |

Set it on any ancestor, such as `.prose`, or on `.ci` itself.

### Classes and attributes

| Selector | Is |
| --- | --- |
| `span.ci` | An icon, with its image in `--ci` |
| `.ci[data-mask]` | An icon in one color, which `color` recolors |
| `--ci-ratio` | An icon's width over its height, when it isn't square |

The plugin sets `--ci` and `--ci-ratio` on the icon's `style`, so leave them be. In forced colors, such as Windows High Contrast, an icon in one color takes the system's text color.

> [!NOTE]
> Each icon carries its image in an inline `style`, so a [Content Security Policy](https://developer.mozilla.org/docs/Web/HTTP/CSP) needs `style-src-attr 'unsafe-inline'` and `img-src data:`.

### Example

Larger icons in prose, in a muted color:

```css
.prose {
  --comark-icon-size: 1.25em;
}

.prose .ci[data-mask] {
  color: var(--muted-foreground);
}
```
