---
title: Installation
description: Install comark-ui and render every block with one import.
keywords: getting started, all plugins, every plugin, bundle, kit, starter, one import, setup
tagline: Install comark-ui once to render every block on this site, then turn off what you don't use.
install: pnpm add comark @comark/html comark-ui
---

::examples
:::example{label="Everything"}
````md
> [!TIP]
> One import renders every block on this site.

::steps
### Install
:::code-group
```sh [pnpm]
pnpm add comark @comark/html comark-ui
```
```sh [npm]
npm install comark @comark/html comark-ui
```
:::

### Render
Pass `comarkUi()` to the renderer.
::
````
:::
::

This site renders every page through comark-ui.

## Setup

::steps
### Install the packages

Install Comark, the renderer you use, and comark-ui.

:::code-group
```sh [pnpm]
pnpm add comark @comark/html comark-ui
```
```sh [npm]
npm install comark @comark/html comark-ui
```
```sh [yarn]
yarn add comark @comark/html comark-ui
```
```sh [bun]
bun add comark @comark/html comark-ui
```
:::

For Vue, React, or Svelte, install `@comark/vue`, `@comark/react`, or `@comark/svelte` in place of `@comark/html`.

### Register the blocks

Use `comarkUi()` to get the `plugins` and `components` for one renderer, and import it from the entry that matches the renderer.

:::code-group
```ts [HTML]
import { createHtmlRenderer } from "@comark/html";
import comarkUi from "comark-ui/html";

const render = createHtmlRenderer(comarkUi());
const html = await render("::tabs\n...\n::");
```
```vue [Vue]
<script setup lang="ts">
import { Markdown } from "@comark/vue";
import comarkUi from "comark-ui/vue";

const { plugins, components } = comarkUi();
defineProps<{ source: string }>();
</script>

<template>
  <Markdown :value="source" :plugins="plugins" :components="components" />
</template>
```
```tsx [React]
import { Markdown } from "@comark/react";
import comarkUi from "comark-ui/react";

const { plugins, components } = comarkUi();

export function Doc({ source }: { source: string }) {
  return <Markdown value={source} plugins={plugins} components={components} />;
}
```
:::

For Svelte, import `comarkUi` from `comark-ui/svelte`.

> [!NOTE]
> The Vue, React, and Svelte entries leave out [annotate](/annotate/) and [diff](/diff/), which render only to HTML.

### Write a block

Every block on this site now renders. Try one from the [playground](/play/), or start with a callout:

```md
> [!TIP]
> One import renders every block on this site.
```
::

## Options

Every plugin is on except [include](/include/), which reads files from disk.

### Turn a plugin off

Use `false` to turn a plugin off. Its components go too.

```ts
comarkUi({ zoom: false });
```

### Pass a plugin options

Use an object to pass a plugin its options. Each block's page lists its options under API.

```ts
comarkUi({
  code: { actions: [{ id: "run", label: "Run" }] },
  github: { callouts: false, references: { repo: "owner/name" } },
  table: { root: "data" },
  include: { root: "content" },
});
```

The keys are the packages' names without `comark-`, in camelCase: `fileTree`, `codeNotes`, `readingTime`. `mermaid` turns on comark-pele. `github` takes its three plugins by name, `callouts`, `references`, and `html`. `links` takes `external` and `anchors`.

### Read files

[cast](/cast/), [table](/table/), and [tests](/tests/) read files from disk on their own, so comark-ui gives them a reader that finds none: inline casts, CSV fences, and pasted reports still render. Use `{ root }` to read files under a folder, or `{ read }` to read them yourself.

### Icons

The icon resolver from `icon`'s options also draws the icons of cards, details, file trees, tabs, and code actions, so its `collections` and `fetch` apply to all of them.

### Parse in a browser

Use `chips: { download: false }` when you parse in a browser, since a browser may not download another site's images.

> [!WARNING]
> [diagrams](/diagrams/) sends each diagram's source to `https://kroki.io` unless you pass your own `server`.

### Critic styles

[critic](/critic/) has no component to add its styles. Put `criticCss`, exported by every entry, in the page.

### Text styles

The text around the blocks is styled too: headings, paragraphs, lists, tables, code, and quotes, on the same tokens as the blocks. Use `typeset: false` when your site already styles Markdown. [Typeset](/guide/typeset/) covers what it styles and how to change it.

## Mermaid

comark-ui draws `mermaid` fences with [comark-pele](/mermaid/), a third-party plugin by farnabaz, and puts its diagrams on the shared `--comark-*` tokens. The `mermaid` option takes comark-pele's options, or `false`:

```ts
comarkUi({ mermaid: { languages: ["mermaid"] } }); // only `mermaid` fences, not `pele` ones
comarkUi({ mermaid: false }); // leave `mermaid` fences as code
```

> [!NOTE]
> Pele adds about 260 KB gzipped to a bundle. Turn it off when a bundle size limit matters more than diagrams.

If you register Comark's built-in `mermaid` plugin instead, pass `mermaid: false`, since both read `mermaid` fences. [Mermaid](/mermaid/) covers the syntax and theming.

## One block alone

Every block is also its own package, and comark-ui only registers them. To install fewer, each block's page ends with its package: what to install and how to register it alone. [Renderers](/guide/renderers/) shows several of them in one renderer.

## Versions

comark-ui ships in lockstep with the blocks, so `comark-ui@X` holds every block at version `X`. [comark-linter](/lint/) finds comark-ui when it's installed and checks documents with its plugins.

## Next steps

[Editor](/guide/editor/) adds a Tiptap editor to your app, with Vue bindings, file uploads, and Markdown conversion.

::card-group
:::card{title="Theming" icon="lucide:palette" to="/guide/theming/"}
Match the blocks to your site. Nuxt UI and shadcn/ui apps match with no setup.
:::

:::card{title="Agents" icon="lucide:bot" to="/guide/agents/"}
Install the comark-ui skill so your agent writes the blocks.
:::
::
