---
title: Tabs
description: Tabs and code groups, written in Markdown.
keywords: tab, code group, code-group, package manager, npm, pnpm, yarn, bun, switcher, language tabs
tagline: Tabs of any content and code groups that switch together across the page, and install commands in every package manager.
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

:::example{label="Package managers"}
````md
```sh pm
bun add -d comark-tabs
```
````
:::
::

## Features

- Each `:::tabs-item` inside `::tabs` is a tab, and it holds any Markdown, even other tabs.
- `::code-group` turns code blocks into tabs named by the label after their language.
- A code block marked `pm` becomes a tab for each package manager, whichever one it's written in.
- Blocks with the same `sync` key switch together and remember the choice on the next visit.
- Without a script, every tab shows under its label. The script adds the tab strip, with a sliding highlight, and the arrow keys.

## Usage

Put a `:::tabs-item` inside `::tabs` for each tab.

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
> Every tab needs a `label`, unique within its block, because `sync` matches tabs by label. The plugin reports a missing or repeated label.

### Sync

Use the `sync` prop to switch blocks together. Picking a tab picks the same label in every block with that key, tabs and code groups alike.

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

The script saves the choice in `localStorage` under `comark-tabs:` plus the key, and restores it on the next page with that key. If a switch changes the height of blocks above the clicked one, the page scrolls to keep the tab under the pointer.

### Icon

Use the `icon` prop to draw an icon before a tab's label. It takes an [Iconify](https://icones.js.org) name, such as `lucide:apple` or `logos:pnpm`, or an image URL. [comark-icon](/icon/) resolves and draws it while parsing. It shows without the script and looks and sizes like an `:icon`.

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

Use `::code-group` to show code blocks as tabs, each named by the label in brackets after its language. The tabs sit in a header joined to the block, and the block doesn't repeat the label. Without a script, each block keeps its label as its own header.

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
> A code group holds only code blocks, each with a label. The plugin reports anything else.

### Package managers

Use the `pm` word after a code block's language to turn it into a code group with a tab each for npm, pnpm, yarn, and bun. Write the commands for npm, pnpm, yarn, bun, or deno, and that manager's tab keeps them as written. The group has `sync="pm"`, so it switches with your own `sync="pm"` groups.

::example
````md
```sh pm
yarn add -D comark-tabs
pnpm dlx nuxi@latest module add ui
```
````
::

Only commands that start a line or follow `&&`, `||`, or `;` change, so `cd my-npm-app` stays as written. comark-tabs reads these commands and their usual aliases, such as `npm i` and `pnpx`:

| Command | npm | pnpm | yarn | bun | deno |
| --- | --- | --- | --- | --- | --- |
| Install | `npm install` | `pnpm install` | `yarn install` | `bun install` | `deno install` |
| Frozen install | `npm ci` | `pnpm install --frozen-lockfile` | `yarn install --immutable` | `bun install --frozen-lockfile` | `deno install --frozen` |
| Add | `npm install x` | `pnpm add x` | `yarn add x` | `bun add x` | `deno add npm:x` |
| Remove | `npm uninstall x` | `pnpm remove x` | `yarn remove x` | `bun remove x` | `deno remove npm:x` |
| Run a script | `npm run dev -- --port 3` | `pnpm run dev --port 3` | `yarn dev --port 3` | `bun run dev --port 3` | `deno task dev --port 3` |
| Run a package | `npx x` | `pnpm dlx x` | `yarn dlx x` | `bunx x` | `deno run -A npm:x` |
| Create a project | `npm create x@latest` | `pnpm create x` | `yarn create x` | `bun create x` | `deno init --npm x` |
| Start a package | `npm init` | `pnpm init` | `yarn init` | `bun init` | `deno init` |

Update commands and local execution with `pnpm exec` stay in their own manager's tab, and the plugin leaves out the other tabs with an issue. Add takes `-D` for a dev dependency, `-E` for an exact version, `-O` for an optional one, `--save-peer` for a peer one, and `-g` for global, each as the manager's own flag. Inside a `::code-group`, `pm` does nothing, since the block is already one tab. Set the managers with the [`managers` option](#choose-the-package-managers).

## Examples

### Choose the package managers

Use the `managers` option to change which tabs a `pm` block gets, and their order. Deno is off by default:

```ts
tabs({ managers: ["pnpm", "npm", "yarn", "bun", "deno"] });
```

When a manager has no form for a command, such as `npm install -g` in yarn, comark-tabs leaves out its tab and adds an issue. The block's own manager keeps its tab. A command comark-tabs doesn't read, such as `npm publish`, does the same in every other manager. Write that block as a `::code-group{sync="pm"}` by hand. Register comark-tabs before Shiki, so Shiki highlights every tab it adds.

### Icons for every block

Use the `icons` option to set icons by label once, for every tab without its own. They come from the Iconify API unless you pass the page's `:icon` resolver as `iconResolver`:

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

Images in tabs zoom with [comark-zoom](/zoom/). A gallery or zoom group pages only through what's shown, so it skips images in closed tabs.

## Accessibility

The tabs follow the [WAI-ARIA tabs pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/). The strip is a tab list of buttons that screen readers announce as tabs, with whether each is selected. Each panel is a tab panel named by its tab.

Only the open tab is a tab stop, and the arrow keys open each tab as focus lands on it.

Without the script, the strip is hidden, and a screen reader reads every panel under its label in turn.

### Keyboard interactions

| Key | Description |
| --- | --- |
| `Tab` | Moves focus to the open tab, then to the open panel. |
| `ArrowRight` | Moves focus to the next tab and opens it. From the last tab, wraps to the first. |
| `ArrowLeft` | Moves focus to the previous tab and opens it. From the first tab, wraps to the last. |
| `Home` | Moves focus to the first tab and opens it. |
| `End` | Moves focus to the last tab and opens it. |

On a right-to-left page, the arrow keys follow the reading direction. The keys do nothing with Alt, Ctrl, or Meta held.

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

Pass options under `tabs` in `comarkUi()`, or to `tabs()` when you use it alone.

| Option | Default | Description |
| --- | --- | --- |
| `managers` | `["npm", "pnpm", "yarn", "bun"]` | The tabs a `pm` code block becomes, in order. Add `"deno"` for Deno. See [Choose the package managers](#choose-the-package-managers). |
| `icons` | `{}` | Icons for tabs that don't set one, by label, such as `{ pnpm: "logos:pnpm" }`. Labels match case-insensitively. Each value is an Iconify name or an image URL, like the `icon` prop. See [Icons for every block](#icons-for-every-block). |
| `iconResolver` | The Iconify API | Resolves the icons, from `createIcons()` in comark-icon. Pass the one the page's other plugins use, so they share its `collections` and `fetch`. comark-ui passes the one its `icon` uses. |

### Issues

The plugin adds a problem with any block to `meta.issues`, as [Validation](/guide/validation/) describes:

```txt
`::code-group` 1, block 2: a code block needs a label. Put it in brackets after the language: ```bash [npm].
```

It reports:

- A tab without a label, or two tabs with the same label.
- A `pm` command a package manager has no form for, or a `pm` block with no package manager command.
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

When you render on a server, import `comark-tabs/style.css` with your own styles so the tabs are styled before the components mount.

## Theme

The tab strip is a shadcn/ui-style segmented control that follows the shared tokens in [Theming](/guide/theming/). The rules sit in a `comark` CSS layer, so any plain rule of yours wins.

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

Size icons in tabs with comark-icon's `--comark-icon-size`, as [its theming](/icon/#variables) describes.

### Classes and attributes

| Selector | Is |
| --- | --- |
| `.ct` | The block, with `data-tabs-code` when it's a code group and `data-tabs-sync` when it has a `sync` key |
| `.ct-list` | The strip |
| `.ct-tab` | Each tab, with `aria-selected="true"` on the open one |
| `.ct-panel` | Each panel, with `data-inactive` while it's closed |
| `.ct-caption` | The label over each panel, shown only without the script |
| `[data-tabs-ready]` | On `<html>` once the script runs |

One rule sits outside the `comark` layer. It drops a code group's block margin and top corners to join it to its strip, and has to beat the plain rules pages use for code blocks.

### Example

An open tab in the page's brand color:

```css
:root {
  --ct-active: oklch(0.55 0.2 260);
  --ct-active-text: white;
}
```

To try it, paste it into Extra CSS in the [playground's Theme pane](/play/#preset=tabs-tabs).
