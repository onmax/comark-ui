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
> The Vue, React, and Svelte entries leave out [annotate](/annotate/), [comments](/comments/), [diff](/diff/), and [quiz](/quiz/), which render only to HTML.

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

Pass `false` to turn a plugin and its components off.

```ts
comarkUi({ zoom: false });
```

### Pass a plugin options

Pass an object to set a plugin's options. Each block's page lists them under API.

```ts
comarkUi({
  code: { actions: [{ id: "run", label: "Run" }] },
  github: { callouts: false, references: { repo: "owner/name" } },
  table: { root: "data" },
  include: { root: "content" },
});
```

Each key is the package name without `comark-`, in camelCase, such as `fileTree`, `codeNotes`, or `readingTime`. `mermaid` is comark-pele. `github` takes its three plugins by name, `callouts`, `references`, and `html`. `links` takes `external` and `anchors`.

### Read files

[cast](/cast/), [table](/table/), and [tests](/tests/) can read files from disk, so comark-ui gives them a reader that finds none. Inline casts, CSV fences, and pasted reports still render. Pass `{ root }` to read files under a folder, or `{ read }` to read them yourself.

### Icons

`icon`'s resolver also draws the icons in cards, details, file trees, tabs, and code actions, so its `collections` and `fetch` apply to all of them.

### Parse in a browser

Pass `chips: { download: false }` when you parse in a browser, which may block downloading another site's images.

> [!WARNING]
> [diagrams](/diagrams/) sends each diagram's source to `https://kroki.io` unless you pass your own `server`.

### Critic styles

[critic](/critic/) has no component for its styles. Put `criticCss`, which every entry exports, in the page.

### Text styles

comark-ui also styles the headings, paragraphs, lists, tables, code, and quotes around the blocks, with the same tokens. Pass `typeset: false` if your site already styles Markdown. [Typeset](/guide/typeset/) has the details.

### Untrusted Markdown

`comarkUi()` also returns `tags`, every element a parsed document can hold besides the components: Markdown's own, the raw HTML that GitHub's `html()` keeps, and the plain elements the plugins draw with. With the components' names, it's the allowlist for Comark's `security` plugin, and it follows the options you pass.

```ts
import security from "comark/plugins/security";

const { plugins, components, tags } = comarkUi();
const allowedTags = [...tags, ...Object.keys(components)];
const render = createHtmlRenderer({ plugins: [...plugins, security({ allowedTags })], components });
```

`blocks` lists the blocks the plugins replace while parsing, such as `::code-group`. A linter that reports unknown components needs them beside the components' names.

## Mermaid

comark-ui draws `mermaid` fences with [comark-pele](/mermaid/), a third-party plugin by farnabaz, themed by the shared `--comark-*` tokens. The `mermaid` option takes comark-pele's options, or `false`:

```ts
comarkUi({ mermaid: { languages: ["mermaid"] } }); // only `mermaid` fences, not `pele` ones
comarkUi({ mermaid: false }); // leave `mermaid` fences as code
```

> [!NOTE]
> Pele adds about 260 KB gzipped to a bundle. Turn it off if a size limit matters more than diagrams.

If you use Comark's built-in `mermaid` plugin instead, pass `mermaid: false`, since both read `mermaid` fences. [Mermaid](/mermaid/) covers syntax and theming.

## One block alone

Every block is its own package, and comark-ui only registers them. To install fewer, each block's page ends with how to install and register it alone. [Renderers](/guide/renderers/) shows several in one renderer.

## Versions

`comark-ui@X` holds every block at version `X`. [comark-linter](/lint/) finds an installed comark-ui and checks documents with its plugins.

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
