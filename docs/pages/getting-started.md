---
title: Getting started
description: Install comark-ui and render every block with one import.
keywords: all plugins, every plugin, bundle, kit, starter, one import
tagline: comark-ui registers every block on this site in the order they need, with one icon resolver shared by all of them. Install it once, then turn off what you don't use.
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

## Usage

```ts
import { createHtmlRenderer } from "@comark/html";
import comarkUi from "comark-ui/html";

const render = createHtmlRenderer(comarkUi());
```

`comarkUi()` returns the `plugins` and `components` for one renderer. Import it from `comark-ui/html`, `/vue`, `/react`, or `/svelte`. The Vue, React, and Svelte entries leave out [annotate](/annotate/) and [diff](/diff/), which render only to HTML.

## Options

Every plugin is on except [include](/include/), which reads files from disk. Pass `false` to turn a plugin off, which drops its components too, or an object to pass it options:

```ts
comarkUi({
  zoom: false,
  code: { actions: [{ id: "run", label: "Run" }] },
  github: { callouts: false, references: { repo: "owner/name" } },
  table: { root: "data" },
  include: { root: "content" },
});
```

The keys are the packages' names without `comark-`, in camelCase: `fileTree`, `codeNotes`, `readingTime`. `mermaid` turns on comark-pele. `github` takes its three plugins by name, `callouts`, `references`, and `html`, and `links` takes `external` and `anchors`. Each block's page lists its options under API.

[cast](/cast/), [table](/table/), and [tests](/tests/) read files from disk on their own, so comark-ui gives them a reader that finds none: inline casts, CSV fences, and pasted reports still render. Pass `{ root }` to read files under a folder, or `{ read }` to read them yourself. [diagrams](/diagrams/) sends each diagram's source to `https://kroki.io` unless you pass your own `server`.

The icon resolver from `icon`'s options also draws the icons of cards, details, file trees, tabs, and code actions, so its `collections` and `fetch` apply to all of them. When you parse in a browser, pass `chips: { download: false }`, since a browser may not download another site's images.

[critic](/critic/) has no component to add its styles, so put `criticCss`, exported by every entry, in the page.

## Mermaid

comark-ui draws `mermaid` fences with [comark-pele](/mermaid/), a third-party plugin by farnabaz, and puts its diagrams on the shared `--comark-*` tokens. The `mermaid` option takes comark-pele's options, or `false`:

```ts
comarkUi({ mermaid: { languages: ["mermaid"] } }); // only `mermaid` fences, not `pele` ones
comarkUi({ mermaid: false }); // leave `mermaid` fences as code
```

Pele adds about 260 KB gzipped to a bundle, so turn it off when a bundle size limit matters more than diagrams. If you register Comark's built-in `mermaid` plugin instead, pass `mermaid: false`, since both read `mermaid` fences. [Mermaid](/mermaid/) covers the syntax and theming.

## One block alone

Every block is also its own package, and comark-ui only registers them. To install fewer, each block's page ends with its package: what to install and how to register it alone. [Renderers](/guide/renderers/) shows several of them in one renderer.

## Agents

comark-ui ships the comark-ui agent skill. [Agents](/guide/agents/) shows how to install it, or bundle it in an app so it always matches the plugins the app installed.

## Versions

comark-ui ships in lockstep with the blocks, so `comark-ui@X` holds every block at version `X`. [comark-linter](/lint/) finds comark-ui when it's installed and checks documents with its plugins.
