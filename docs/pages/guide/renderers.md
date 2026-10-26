---
title: Renderers
description: Which renderer each package supports, and how to use several in one document.
keywords: HTML, Vue, React, Svelte, Nuxt, frameworks, components, SSR, setup
tagline: Register every plugin at once with comark-ui, or the ones you pick in one renderer. The same markup comes out of HTML, Vue, React, and Svelte, and each package's docs page lists the props.
---

## Every plugin at once

[`comark-ui`](/getting-started/) is the install the docs recommend: every package in one install, registered in the order they need, with one icon resolver shared by `:icon`, cards, details, file trees, tabs, and code actions. It returns the `plugins` and `components` for one renderer:

```ts
import { createHtmlRenderer } from "@comark/html";
import comarkUi from "comark-ui/html"; // or /vue, /react, /svelte

const render = createHtmlRenderer(comarkUi({ zoom: false, github: { references: { repo: "owner/name" } } }));
```

Every plugin is on but `include`, which reads from disk, and cast, table, and tests read no files until you give them options. `false` turns one off along with its components, and an object passes it options. The Vue, React, and Svelte entries leave out annotate and diff, which render only to HTML. comark-ui ships with the plugins, so its version is theirs.

## Support

| Package | `@comark/html` | `@comark/vue` | `@comark/react` | `@comark/svelte` |
| --- | --- | --- | --- | --- |
| [annotate](/annotate/) | `comark-annotate/html` | | | |
| [carousel](/carousel/) | `comark-carousel/html` | `comark-carousel/vue` | `comark-carousel/react` | `comark-carousel/svelte` |
| [charts](/charts/) | `comark-charts/html` | `comark-charts/vue` | `comark-charts/react` | `comark-charts/svelte` |
| [code](/code/) | `comark-code/html` | `comark-code/vue` | `comark-code/react` | `comark-code/svelte` |
| [embed](/embed/) | `comark-embed/html` | `comark-embed/vue` | `comark-embed/react` | `comark-embed/svelte` |
| [github](/github/) | `comark-github/html` | `comark-github/vue` | `comark-github/react` | `comark-github/svelte` |
| [tabs](/tabs/) | `comark-tabs/html` | `comark-tabs/vue` | `comark-tabs/react` | `comark-tabs/svelte` |
| [zoom](/zoom/) | `comark-zoom/html` | `comark-zoom/vue` | `comark-zoom/react` | `comark-zoom/svelte` |

Each entry exports the parse plugin as `default` and the renderer's `components`.

Annotate renders only to HTML. A screenshot's notes are Markdown, and a Vue, React, or Svelte version would each have to copy the whole figure. Annotate also draws the marks on a chart, so those marks show only in `@comark/html`. The other renderers draw the chart without them.

[include](/include/) has no components, because what it pastes renders like the rest of the page. It works with any renderer. [lint](/lint/) checks documents and doesn't render them.

## Several plugins

To pick plugins yourself, pass them all to one renderer, and spread their `components` into one map:

```ts
import { createHtmlRenderer } from "@comark/html";
import include from "comark-include";
import annotate, { components as annotateComponents } from "comark-annotate/html";
import carousel, { components as carouselComponents } from "comark-carousel/html";
import embed, { components as embedComponents } from "comark-embed/html";
import { callouts, components as githubComponents } from "comark-github/html";
import zoom, { components as zoomComponents } from "comark-zoom/html";

const render = createHtmlRenderer({
  plugins: [include(), annotate(), carousel(), embed(), callouts(), zoom()],
  components: {
    ...annotateComponents,
    ...carouselComponents,
    ...embedComponents,
    ...githubComponents,
    ...zoomComponents,
  },
});
```

Put `include` first, because it pastes files into the Markdown before the others read it. `callouts()` is named `alert`, so it takes the place of Comark's built-in alert plugin wherever you list it.

Annotate brings zoom and carousel with it, so screenshots and comparisons zoom without `zoom()`. Add `zoom()` when content images and `::zoom` blocks should zoom too.

## Scripts and styles

Nothing needs a script to read. Zoom, carousel, tabs, code, and annotate add behavior on top: zooming, arrows and keys, switching tabs, copying and wrapping code, hover and copy. Callouts and embeds need only styles.

The HTML renderers inline each plugin's styles, and its script if it has one, once per document.

The [text styles](/guide/typeset/) are the exception in every renderer: Vue, React, and Svelte render them with the document too, since they're scoped to the element the document renders into.

The Vue, React, and Svelte components add the styles and start the script when they mount. They stop the script when the last one unmounts. When you render on a server, import each package's `style.css`, such as `comark-zoom/style.css`, with your own styles, so the page doesn't shift when the components mount.

Without a renderer, call `start()` from `comark-zoom/client` once on a page with `data-zoom` elements. It adds the styles and returns a function that stops it.

## Content Security Policy

The inlined `<style>` and `<script>` elements need `'unsafe-inline'` in `style-src` and `script-src`, or a hash of each. A script's text changes only between versions. Annotate also places marks with `style` attributes, so its pages need `style-src 'unsafe-inline'`.

Notes, slides, and callouts are ordinary Markdown, so raw HTML in them renders like anywhere else in the document. For untrusted input, add Comark's `security` plugin and list the tags to drop, such as `security({ blockedTags: ["script", "style", "iframe"] })`.
