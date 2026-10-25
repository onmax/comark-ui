---
title: Tabs
description: Tabs and code groups, written in Markdown.
keywords: tab, code group, code-group, package manager, npm, pnpm, yarn, bun, switcher, language tabs
tagline: Tabs of any content and code groups that switch together across the page, and npm commands in every package manager.
group: Page behavior
icon: panels-top-left
blurb: Tabs and code groups
credits: 'Syntax from <a href="https://ui.nuxt.com">Nuxt UI</a>''s tabs and code groups.'
---

::examples
:::example{label="Tabs"}
```md
::tabs{sync="os"}
:::tabs-item{label="macOS"}
Press **⌘K** to find the pigeon data.
:::

:::tabs-item{label="Windows"}
Press **Ctrl+K** to find the pigeon data.
:::
::
```
:::

:::example{label="Code group"}
````md
::code-group{sync="pm"}
```sh [pnpm]
pnpm add comark-tabs
```

```sh [npm]
npm install comark-tabs
```

```sh [yarn]
yarn add comark-tabs
```
::
````
:::

:::example{label="Icons"}
````md
::code-group{sync="pm"}
```sh [pnpm] icon=logos:pnpm
pnpm add comark-tabs
```

```sh [npm] icon=logos:npm-icon
npm install comark-tabs
```

```sh [yarn] icon=logos:yarn
yarn add comark-tabs
```
::
````
:::

:::example{label="npm2yarn"}
````md
```sh npm2yarn
npm install -D comark-tabs
```
````
:::
::

## Features

- Each `:::tabs-item` inside `::tabs` is a tab, and it holds any Markdown, even other tabs.
- `::code-group` turns code blocks into tabs named by the label after their language.
- A code block marked `npm2yarn` becomes a tab for each package manager.
- Blocks with the same `sync` key switch together, and the choice is remembered on the next visit.
- Without a script, every tab shows under its label, one after another. The script adds the tab strip, whose highlight slides to the tab you pick, and the arrow keys.

## Usage

Put `:::tabs-item` blocks inside `::tabs`. Each one is a tab.

::example
```md
::tabs
:::tabs-item{label="This week"}
14 rubber ducks bought, 14 bugs fixed.
:::

:::tabs-item{label="Last week"}
3 rubber ducks bought, 3 bugs fixed.
:::
::
```
::

### Label

Use the `label` prop to name a tab.

```md
:::tabs-item{label="macOS"}
Press **⌘K** to search.
:::
```

> [!NOTE]
> Every tab needs a `label`, and labels in one block must differ, because `sync` matches tabs by label. A missing or repeated label is reported.

### Sync

Use the `sync` prop to switch blocks together. Picking a tab picks the tab with the same label in every block with that key, now and on the next visit. Tabs and code groups with the same key switch together.

::example
```md
::tabs{sync="os"}
:::tabs-item{label="macOS"}
Press **⌘K** to find the pigeon data.
:::

:::tabs-item{label="Windows"}
Press **Ctrl+K** to find the pigeon data.
:::
::

::tabs{sync="os"}
:::tabs-item{label="macOS"}
Pigeon data lives in `~/Library/Pigeons`.
:::

:::tabs-item{label="Windows"}
Pigeon data lives in `%APPDATA%\Pigeons`.
:::
::
```
::

The script saves the choice in `localStorage` under `comark-tabs:` and the key, and restores it on the next page that uses it. When a switch changes the height of blocks above the one the reader clicked, the page scrolls by as much, so the tab stays under the pointer.

### Icon

Use the `icon` prop to draw an icon before a tab's label. It takes an [Iconify](https://icones.js.org) name, such as `lucide:apple` or `logos:pnpm`, or the URL of an image. [comark-icon](/icon/) resolves it while parsing and draws it. The icon shows without the script too, and looks and sizes like an `:icon`.

::example
```md
::tabs
:::tabs-item{label="macOS" icon="lucide:apple"}
Press **⌘K** to search.
:::

:::tabs-item{label="Windows" icon="lucide:monitor"}
Press **Ctrl+K** to search.
:::
::
```
::

In a code group, write a code block's icon after its label, as `icon=logos:pnpm`.

### Code group

Use `::code-group` to show code blocks as tabs. Each tab is named by the label in brackets after the block's language. The label becomes the tab, so the code block doesn't repeat it, and the tabs sit in a header joined to the block. Without a script, each block keeps its label as a header of its own.

::example
````md
::code-group{sync="pm"}
```sh [pnpm]
pnpm add comark-tabs
```

```sh [npm]
npm install comark-tabs
```
::
````
::

> [!NOTE]
> Only code blocks go inside a code group, and each one needs a label. Anything else is reported.

### npm2yarn

Use the `npm2yarn` word after a code block's language to turn npm commands into a code group with a tab for each package manager: npm, pnpm, yarn, and bun. The group has `sync="pm"`, so it switches with the code groups you write with that key.

::example
````md
```sh npm2yarn
npm install -D comark-tabs
npx nuxi@latest module add ui
```
````
::

Only lines that start with `npm` or `npx`, or commands after `&&`, `||`, or `;`, change, so `cd my-npm-app` stays as written. [npm-to-yarn](https://github.com/nebrelbug/npm-to-yarn) converts them, and bun's tab writes `bunx` and `bun create` as Bun's docs do. In a `::code-group` the block is one tab already, and `npm2yarn` does nothing. Set the managers with the [`managers` option](#choose-the-package-managers).

## Examples

### Choose the package managers

A code block marked `npm2yarn` gets a tab for npm, pnpm, yarn, and bun, in that order. Use the `managers` option to set others, in the order you want. Deno is there to add:

```ts
tabs({ managers: ["pnpm", "npm", "yarn", "bun", "deno"] });
```

A command a manager has no form for, such as `npm ci` in pnpm, leaves that manager's tab out, keeps npm's, and adds an issue. Write that block as a `::code-group{sync="pm"}` by hand. Register comark-tabs before Shiki, so Shiki highlights every tab it adds.

### Icons for every block

Use the `icons` option to set icons once for every block, by label, for tabs that don't set their own. Icons come from the Iconify API by default. Pass the resolver the page's `:icon` uses as `iconResolver`, so they share its sets and `fetch`:

```ts
import { icons as logos } from "@iconify-json/logos";
import icon, { createIcons } from "comark-icon/html";
import tabs from "comark-tabs/html";

const icons = createIcons({ collections: { logos } });
const plugins = [
  icon(icons),
  tabs({ iconResolver: icons, icons: { pnpm: "logos:pnpm", npm: "logos:npm-icon" } }),
];
```

Size them with `--comark-icon-size`, and style them as [comark-icon's theme](/icon/#theme) describes.

### Zoom images in tabs

Images in tabs zoom with [comark-zoom](/zoom/) like any other image. A gallery or zoom group only pages through what's shown, so images in closed tabs stay out of it.

## Accessibility

The tabs follow the [WAI-ARIA tabs pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/). The strip is a tab list, and each tab is a button that screen readers announce as a tab, with whether it's selected. Each panel is a tab panel named by its tab.

Only the open tab is a tab stop. Tab moves focus into the strip, then on to the open panel. The arrow keys move between tabs and open each one as focus lands on it.

Without the script, the strip is hidden and every panel shows under its label, so a screen reader reads them one after another.

### Keyboard interactions

| Key | Description |
| --- | --- |
| `Tab` | Moves focus to the open tab, then to the open panel. |
| `ArrowRight` | Moves focus to the next tab and opens it. From the last tab, wraps to the first. |
| `ArrowLeft` | Moves focus to the previous tab and opens it. From the first tab, wraps to the last. |
| `Home` | Moves focus to the first tab and opens it. |
| `End` | Moves focus to the last tab and opens it. |

On a right-to-left page, the arrow keys follow the reading direction. The keys do nothing when pressed with Alt, Ctrl, or Meta.

## API

### Props

#### Tabs

| Prop | Default | Description |
| --- | --- | --- |
| `sync` | — | A key shared by blocks that switch together. Picking a tab picks the tab with the same label in every block with that key, now and on the next visit. |

#### Tabs item

| Prop | Default | Description |
| --- | --- | --- |
| `label` | — | The tab's name. Required. Labels in one block must differ. |
| `icon` | — | An [Iconify](https://icones.js.org) name such as `lucide:apple`, or an image URL, drawn by [comark-icon](/icon/) before the label. |

#### Code group

| Prop | Default | Description |
| --- | --- | --- |
| `sync` | — | As on `::tabs`. A code group and tabs with the same key switch together. |

Each code block in a code group takes its label in brackets after its language, such as `[pnpm]`, and an icon after it, as `icon=logos:pnpm`.

### Options

The options go under `tabs` in `comarkUi()`, or to `tabs()` when you use it alone.

| Option | Default | Description |
| --- | --- | --- |
| `managers` | `["npm", "pnpm", "yarn", "bun"]` | The tabs an `npm2yarn` code block becomes, in order. Add `"deno"` for Deno. See [Choose the package managers](#choose-the-package-managers). |
| `icons` | `{}` | Icons for tabs that don't set one, by label, such as `{ pnpm: "logos:pnpm" }`. Labels match without regard to case. Each value is an Iconify name or an image URL, like the `icon` prop. See [Icons for every block](#icons-for-every-block). |
| `iconResolver` | The Iconify API | Resolves the icons, from `createIcons()` in comark-icon. Pass the one the page's other plugins use, so they share its `collections` and `fetch`. comark-ui passes the one its `icon` uses. |

### Issues

The plugin adds a problem with any block to `meta.issues`, as [Validation](/guide/validation/) describes:

```txt
`::code-group` 1, block 2: a code block needs a label. Put it in brackets after the language: ```bash [npm].
```

It reports:

- A tab without a label, or two tabs with the same label.
- An `npm2yarn` command a package manager has no form for, or an `npm2yarn` block with no npm command.
- An icon it can't draw, in comark-icon's words.
- Content outside every tab, which doesn't render.
- Anything but code blocks in a code group.
- A block with no tabs.
- A `:::tabs-item` outside `::tabs`, which renders as plain content.
- A prop the block doesn't read.

Each one has its own rule in [Doctor](/doctor/). Rendering never throws.

### Package

comark-ui brings `comark-tabs` and registers it. To use it alone, install it and pass the renderer's `components`:

```sh
pnpm add comark @comark/html comark-tabs
```

```ts
import { createHtmlRenderer } from "@comark/html";
import tabs, { components } from "comark-tabs/html";

const render = createHtmlRenderer({ plugins: [tabs()], components });
```

For Vue, React, or Svelte, import from `comark-tabs/vue`, `comark-tabs/react`, or `comark-tabs/svelte`. Svelte needs 5.20 or later. [Renderers](/guide/renderers/) covers server rendering and using it with other plugins.

## Theme

The tab strip is a segmented control in the style of shadcn/ui, and follows the shared tokens in [Theming](/guide/theming/). Five variables of its own change the strip, the open tab, and the space under them. The rules sit in a `comark` CSS layer, so a plain rule of your own wins over any of them.

### Shared tokens

| Token | Used for |
| --- | --- |
| `--comark-background` | The open tab |
| `--comark-foreground` | The open tab's label, and hovered labels |
| `--comark-muted` | The other labels, and the captions without the script |
| `--comark-border` | The strip's frame |
| `--comark-accent` | The strip's tint |
| `--comark-ring` | Focus rings on tabs and panels |
| `--comark-radius` | The strip's, tabs', and panels' corners |
| `--comark-font` | The labels |

### Variables

Set these on `.ct` or any ancestor, such as `:root`:

| Variable | Default | Used for |
| --- | --- | --- |
| `--ct-surface` | `--comark-accent` at 50% | Behind the strip, and a code group's captions without the script |
| `--ct-active` | `--comark-background`, a little lighter when it is dark | The open tab |
| `--ct-active-text` | `--comark-foreground` | The open tab's label |
| `--ct-gap` | `0.75rem` | The space between the strip and the open panel, except in a code group, whose block hangs from its strip |
| `--ct-font-size` | `0.8125rem` | The labels and captions |

Icons in tabs come from comark-icon: size them with `--comark-icon-size`, as [its theming](/icon/#variables) describes.

### Classes and attributes

| Selector | Is |
| --- | --- |
| `.ct` | The block, with `data-tabs-code` when it's a code group and `data-tabs-sync` when it has a `sync` key |
| `.ct-list` | The strip |
| `.ct-tab` | Each tab, with `aria-selected="true"` on the open one |
| `.ct-panel` | Each panel, with `data-inactive` while it's closed |
| `.ct-caption` | The label over each panel, shown only without the script |
| `[data-tabs-ready]` | On `<html>` once the script runs |

One rule sits outside the `comark` layer: pages style code blocks with plain rules, so the rule that drops a code group's block margin and top corners, to join it to its strip, has to beat them.

### Example

An open tab in the page's brand color:

```css
:root {
  --ct-active: oklch(0.55 0.2 260);
  --ct-active-text: white;
}
```

To try it, paste it into Extra CSS in the [playground's Theme pane](/play/#preset=tabs-tabs).
