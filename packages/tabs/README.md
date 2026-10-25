# comark-tabs

[![npm version](https://npmx.dev/api/registry/badge/version/comark-tabs)](https://npmx.dev/package/comark-tabs)
[![npm downloads](https://npmx.dev/api/registry/badge/downloads-month/comark-tabs)](https://npmx.dev/package/comark-tabs)
[![install size](https://npmx.dev/api/registry/badge/size/comark-tabs)](https://npmx.dev/package/comark-tabs)
[![license](https://npmx.dev/api/registry/badge/license/comark-tabs)](https://npmx.dev/package/comark-tabs)
[![docs](https://img.shields.io/badge/docs-comark--ui.onmax.me-14b8a6?labelColor=0a0a0a)](https://comark-ui.onmax.me/tabs/)

Tabs and code groups, written in Markdown. Without a script every tab shows under its label, one after another; the script adds the tab strip, the arrow keys, and `sync`, which switches every block with the same key at once and remembers the choice. A [Comark](https://comark.dev) plugin for HTML, Vue, React, and Svelte.

```sh
pnpm add comark comark-tabs
```

```ts
import { createHtmlRenderer } from "@comark/html";
import tabs, { components } from "comark-tabs/html";

const render = createHtmlRenderer({ plugins: [tabs()], components });
```

Each `:::tabs-item` inside `::tabs` is a tab. In a `::code-group`, each code block is one, labelled by the name in brackets after its language:

````md
::tabs{sync="os"}
:::tabs-item{label="macOS"}
Press **⌘K** to find the pigeon data.
:::

:::tabs-item{label="Windows"}
Press **Ctrl+K** to find the pigeon data.
:::
::

::code-group{sync="pm"}
```sh [pnpm]
pnpm add comark-tabs
```

```sh [npm]
npm install comark-tabs
```
::
````

A code block marked `pm` after its language, as in `sh pm`, holds package manager commands in any manager, npm, pnpm, yarn, bun, or deno, and becomes a code group with `sync="pm"` and a tab each for npm, pnpm, yarn, and bun. It reads installs, adds, removes, updates, scripts, `npx` and `dlx`, `create`, and `init`, and only commands that start a line or follow `&&`, `||`, or `;` change. Choose the managers and their order with `tabs({ managers: ["pnpm", "npm", "yarn", "bun", "deno"] })`.

A tab takes an `icon`, an [Iconify](https://icones.js.org) name or an image URL: `:::tabs-item{label="macOS" icon="lucide:apple"}`, or `icon=logos:pnpm` after a code block's label. [comark-icon](https://comark-ui.onmax.me/icon/) resolves it while parsing, from the Iconify API by default, and draws it as a CSS image, in the text's color when it has one color. Pass the resolver your `:icon`s use as `tabs({ iconResolver })`, so tabs share its sets and `fetch`, and icons by label for every block as `tabs({ icons: { pnpm: "logos:pnpm" } })`. Size them with `--comark-icon-size`.

The markup follows the WAI-ARIA tabs pattern: ←, →, Home, and End move between tabs and open them. Blocks with the same `sync` switch together by label, the choice is saved in `localStorage` under `comark-tabs:` and the key, and the page scrolls to keep the clicked tab still when blocks above it change height. Labels and `sync` can be bound to the front matter, such as `:label="frontmatter.name"`.

The plugin adds every problem to `meta.issues`, so a host can reject a document before publishing it: a tab without a label, two tabs with the same label, a `pm` command a package manager has no form for (its tab is left out), a `pm` block with no command, an icon it can't find or load, content outside every tab (it doesn't render), anything but code blocks in a code group, a block with no tabs, and a `:::tabs-item` outside `::tabs` (it renders as plain content). Each issue names its block and says how to fix it.

## Renderers

| Renderer | Import |
| --- | --- |
| `@comark/html` | `comark-tabs/html`: the script is inlined once per document |
| `@comark/vue` | `comark-tabs/vue` |
| `@comark/react` | `comark-tabs/react` |
| `@comark/svelte` | `comark-tabs/svelte`, Svelte 5.20 or later |

Each entry exports the parse plugin as `default` and the renderer's `components`.

The tab strip is a segmented control in the style of shadcn/ui, and in a code group it's the header of one card with the code block. The styles read shadcn's CSS variables, such as `--background` and `--border`, when the page has them, and use its neutral theme otherwise. Set the `--comark-*` tokens to theme every comark plugin at once. The rules sit in a `comark` CSS layer, so any plain rule of your own wins, except the one that joins a code group's block to its header. `--ct-surface`, `--ct-active`, `--ct-active-text`, `--ct-gap`, and `--ct-font-size` change the strip, the open tab, and the labels; see the tabs' [Theming page](https://comark-ui.onmax.me/tabs/#theme).
