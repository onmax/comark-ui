# Tabs and code groups

comark-tabs draws `::tabs` of any Markdown, `::code-group` of code blocks, and a tab per package manager for a code block marked `npm2yarn`. Use tabs for versions of one thing where each reader needs only one, such as an operating system, a framework, or a package manager.

## Syntax

````md
::code-group{sync="pm"}
```sh [pnpm]
pnpm add comark-tabs
```

```sh [npm]
npm install comark-tabs
```
::

::tabs{sync="os"}
:::tabs-item{label="macOS"}
Press **⌘K** to find the pigeon data.
:::

:::tabs-item{label="Windows"}
Press **Ctrl+K** to find the pigeon data.
:::
::
````

- `::tabs`: each `:::tabs-item` inside is one tab. Content outside every tab doesn't render, and is reported.
- `:::tabs-item`: `label` is required and must differ from the other labels in its block, since `sync` matches tabs by label. `icon` draws an Iconify name, such as `lucide:apple`, or an image URL before the label.
- `::code-group`: only code blocks go inside. Name each one's tab in brackets after its language, as in `sh [pnpm]`, with an optional icon after it, as in `sh [pnpm] icon=logos:pnpm`. The tab replaces the block's own title, and comark-code's `title="pnpm"` names no tab.
- `sync`, on either block, is a key shared by blocks that switch together. Picking a tab picks the tab with the same label in every block with that key, and the next page that uses the key remembers it.
- A code block marked `npm2yarn`, as in `sh npm2yarn`, holds npm commands and becomes a code group with a tab each for npm, pnpm, yarn, and bun, synced as `pm`. Only commands that start with `npm` or `npx` change, at the start of a line or after `&&`, `||`, or `;`. Inside a `::code-group`, `npm2yarn` does nothing.

## Choose the block

- `::code-group` when every tab is one code block, such as one config file per framework. Give every install snippet `sync="pm"`, the key `npm2yarn` uses, so the reader picks a package manager once.
- `npm2yarn` for npm commands, so you write them once. A command with no form in a manager, such as `npm ci` in pnpm, yarn, or bun, leaves those tabs out and is reported. Write that block as a `::code-group{sync="pm"}` by hand.
- `::tabs` when a tab holds prose, images, or several blocks.

Put only alternatives in tabs. Anything every reader needs goes outside them, since a reader sees one tab at a time. For a before and after, use annotate's `::compare` or comark-diff's `::diff`, which show both sides at once.

## Register

- In `comark-ui`: on, as `tabs`. `tabs: { managers }` sets the tabs an `npm2yarn` block gets, in order. The default is `["npm", "pnpm", "yarn", "bun"]`, and `"deno"` can join. `tabs: { icons }` gives each tab without an icon one by its label, such as `{ pnpm: "logos:pnpm" }`. Icons resolve through the preset's `icon` options, from the Iconify API unless its `collections` hold the set.
- Alone: `pnpm add comark @comark/html comark-tabs`, then `createHtmlRenderer({ plugins: [tabs()], components })` with both from `comark-tabs/html`. `comark-tabs/vue`, `/react`, and `/svelte` (Svelte 5.20 or later) export the same pair for those renderers. It takes `managers`, `icons`, and `iconResolver`, a `createIcons()` from comark-icon to share with `:icon`. List it before Shiki, so Shiki highlights the tabs `npm2yarn` adds.
