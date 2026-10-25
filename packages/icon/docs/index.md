---
title: Icon
description: Iconify icons in Markdown, drawn as CSS in every renderer.
keywords: Iconify, Lucide, SVG icons, Heroicons, Material icons, Tabler, Phosphor, Simple Icons, Nuxt UI icons
tagline: Write :icon{name="lucide:apple"} with any of Iconify's 200,000 icons, and get it on the page with no script.
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

:::example{label="Nuxt UI spelling"}
```md
:icon{name="simple-icons:github"} and :icon{name="i-simple-icons-github"}, as Nuxt UI writes it, draw the same icon.
```
:::
::

An icon in one color takes the color of the text around it and follows its theme. One with colors of its own, such as a logo, keeps them.

The plugin resolves icons while parsing and writes them into the page as CSS images. The page asks no server for them, and they show without a script.

The resolver is public, so other plugins take the same options and draw their icons with it. [comark-tabs](/tabs/#icon) uses it for tab icons.

## Usage

```md
:icon{name="lucide:apple"}
:icon{name="lucide:apple" label="Apple"}
```

| Prop | |
| --- | --- |
| `name` | An icon: `set:name`, such as `lucide:apple`, or the URL of an image. Required. Browse the sets at [icones.js.org](https://icones.js.org). |
| `label` | What the icon means, for screen readers. Without one, the icon is decoration and they skip it. |

Give a `label` when the icon carries meaning the text around it doesn't, such as a lone status icon. Leave it out when a word next to it says the same.

### Names

Write `set:name`. Nuxt UI's `i-lucide-apple` and `i-lucide:apple` work too, so Markdown written for Nuxt UI renders the same. A name can be bound to the front matter, as `:icon{:name="frontmatter.icon"}`.

## Examples

### Validation

The plugin checks every icon while parsing and adds the problems to `meta.issues`. An icon it can't draw is left out of the page.

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

These options go under `icon` in `comarkUi()`, or to `icon()` when you use the plugin alone.

### Where icons come from

With no options, the plugin fetches each icon from the [Iconify API](https://iconify.design/docs/api/) while parsing. It asks once per process, for a few icons per request. To build offline, or to keep the output from depending on Iconify, install the sets you use and pass them in `collections`:

```ts
import { icons as lucide } from "@iconify-json/lucide";
import icon from "comark-icon/html";

icon({ collections: { lucide }, fetch: false });
```

| Option | |
| --- | --- |
| `collections` | Sets by prefix, used before the API. A set is an Iconify set from `@iconify-json/*`, or SVG markup by name, for icons of your own. |
| `fetch` | `true` by default. `false` resolves only `collections`; a URL asks an Iconify API of your own. |

Icons of your own, from SVG files:

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

### Sharing options with other plugins

`createIcons()` makes one resolver with these options. Pass it to the plugin, and to other plugins that draw icons, so a page sets them once:

```ts
import icon, { createIcons } from "comark-icon/html";

const icons = createIcons({ collections: { lucide } });
const plugins = [icon(icons)];
```

`comarkUi()` does this for you: it makes one resolver from the `icon` options and shares it with cards, details, file trees, tabs, and code actions.

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

### Classes

An icon is a `span.ci`. An icon in one color has `data-mask`, so `color` recolors it. Its image is in `--ci`, and an icon that isn't square has its width over its height in `--ci-ratio`. The plugin sets both on the icon's `style`, so leave them be. In forced colors, such as Windows High Contrast, an icon in one color takes the system's text color.

Each icon carries its image in an inline `style`, so a [Content Security Policy](https://developer.mozilla.org/docs/Web/HTTP/CSP) needs `style-src-attr 'unsafe-inline'` and `img-src data:`.

```css
.prose {
  --comark-icon-size: 1.25em;
}

.prose .ci[data-mask] {
  color: var(--muted-foreground);
}
```
