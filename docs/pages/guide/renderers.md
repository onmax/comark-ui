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

Every plugin is on but `include`, which reads from disk, and cast, table, and tests read no files until you give them options. `false` turns one off along with its components, and an object passes it options. The Vue, React, and Svelte entries leave out annotate, diff, and quiz, which render only to HTML. comark-ui ships with the plugins, so its version is theirs.

## Support

| Package | `@comark/html` | `@comark/vue` | `@comark/react` | `@comark/svelte` |
| --- | --- | --- | --- | --- |
| [annotate](/annotate/) | `comark-annotate/html` | | | |
| [badge](/badge/) | `comark-badge/html` | `comark-badge/vue` | `comark-badge/react` | `comark-badge/svelte` |
| [cards](/cards/) | `comark-cards/html` | `comark-cards/vue` | `comark-cards/react` | `comark-cards/svelte` |
| [carousel](/carousel/) | `comark-carousel/html` | `comark-carousel/vue` | `comark-carousel/react` | `comark-carousel/svelte` |
| [cast](/cast/) | `comark-cast/html` | `comark-cast/vue` | `comark-cast/react` | `comark-cast/svelte` |
| [charts](/charts/) | `comark-charts/html` | `comark-charts/vue` | `comark-charts/react` | `comark-charts/svelte` |
| [chips](/chips/) | `comark-chips/html` | `comark-chips/vue` | `comark-chips/react` | `comark-chips/svelte` |
| [code](/code/) | `comark-code/html` | `comark-code/vue` | `comark-code/react` | `comark-code/svelte` |
| [code-notes](/code-notes/) | `comark-code-notes/html` | `comark-code-notes/vue` | `comark-code-notes/react` | `comark-code-notes/svelte` |
| [colors](/colors/) | `comark-colors/html` | `comark-colors/vue` | `comark-colors/react` | `comark-colors/svelte` |
| [details](/details/) | `comark-details/html` | `comark-details/vue` | `comark-details/react` | `comark-details/svelte` |
| [diagrams](/diagrams/) | `comark-diagrams/html` | `comark-diagrams/vue` | `comark-diagrams/react` | `comark-diagrams/svelte` |
| [diff](/diff/) | `comark-diff/html` | | | |
| [embed](/embed/) | `comark-embed/html` | `comark-embed/vue` | `comark-embed/react` | `comark-embed/svelte` |
| [fields](/fields/) | `comark-fields/html` | `comark-fields/vue` | `comark-fields/react` | `comark-fields/svelte` |
| [file-tree](/file-tree/) | `comark-file-tree/html` | `comark-file-tree/vue` | `comark-file-tree/react` | `comark-file-tree/svelte` |
| [github](/github/) | `comark-github/html` | `comark-github/vue` | `comark-github/react` | `comark-github/svelte` |
| [icon](/icon/) | `comark-icon/html` | `comark-icon/vue` | `comark-icon/react` | `comark-icon/svelte` |
| [links](/links/) | `comark-links/html` | `comark-links/vue` | `comark-links/react` | `comark-links/svelte` |
| [magic-move](/magic-move/) | `comark-magic-move/html` | `comark-magic-move/vue` | `comark-magic-move/react` | `comark-magic-move/svelte` |
| [mark](/mark/) | `comark-mark/html` | `comark-mark/vue` | `comark-mark/react` | `comark-mark/svelte` |
| [math](/math/) | `comark-mathml/html` | `comark-mathml/vue` | `comark-mathml/react` | `comark-mathml/svelte` |
| [media](/media/) | `comark-media/html` | `comark-media/vue` | `comark-media/react` | `comark-media/svelte` |
| [metrics](/metrics/) | `comark-metrics/html` | `comark-metrics/vue` | `comark-metrics/react` | `comark-metrics/svelte` |
| [outline](/outline/) | `comark-outline/html` | `comark-outline/vue` | `comark-outline/react` | `comark-outline/svelte` |
| [properties](/properties/) | `comark-properties/html` | `comark-properties/vue` | `comark-properties/react` | `comark-properties/svelte` |
| [qr](/qr/) | `comark-qr/html` | `comark-qr/vue` | `comark-qr/react` | `comark-qr/svelte` |
| [quiz](/quiz/) | `comark-quiz/html` | | | |
| [sources](/sources/) | `comark-sources/html` | `comark-sources/vue` | `comark-sources/react` | `comark-sources/svelte` |
| [steps](/steps/) | `comark-steps/html` | `comark-steps/vue` | `comark-steps/react` | `comark-steps/svelte` |
| [table](/table/) | `comark-table/html` | `comark-table/vue` | `comark-table/react` | `comark-table/svelte` |
| [tabs](/tabs/) | `comark-tabs/html` | `comark-tabs/vue` | `comark-tabs/react` | `comark-tabs/svelte` |
| [tests](/tests/) | `comark-tests/html` | `comark-tests/vue` | `comark-tests/react` | `comark-tests/svelte` |
| [zoom](/zoom/) | `comark-zoom/html` | `comark-zoom/vue` | `comark-zoom/react` | `comark-zoom/svelte` |

Each entry exports the parse plugin as `default` and the renderer's `components`. [github](/github/) and [links](/links/) export their plugins by name instead, since each has several.

Annotate renders only to HTML. A screenshot's notes are Markdown, and a Vue, React, or Svelte version would each have to copy the whole figure. Annotate also draws the marks on a chart, so those marks show only in `@comark/html`. The other renderers draw the chart without them. [diff](/diff/) and [quiz](/quiz/) render only to HTML too.

[cjk](/cjk/), [critic](/critic/), [deflist](/deflist/), [figure](/figure/), [footnotes](/footnotes/), [keys](/keys/), [reading-time](/reading-time/), and [xref](/xref/) have no components: they turn their syntax into plain HTML elements, or write to the document's meta, so they work with any renderer. [include](/include/) has none either, because what it pastes renders like the rest of the page. [chat](/chat/) renders AI SDK messages with `@comark/vue`, `@comark/react`, or `@comark/svelte` rather than plugging into them. [lint](/lint/) checks documents and doesn't render them.

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

Nothing needs a script to read. Zoom, carousel, tabs, code, annotate, and Mermaid add behavior on top: zooming, arrows and keys, switching tabs, copying and wrapping code, hover and copy, and copying a diagram as an image or its source. Callouts and embeds need only styles.

The HTML renderers inline each plugin's styles, and its script if it has one, once per document.

The [text styles](/guide/typeset/) are the exception in every renderer: Vue, React, and Svelte render them with the document too, since they're scoped to the element the document renders into.

The Vue, React, and Svelte components add the styles and start the script when they mount. They stop the script when the last one unmounts. When you render on a server, import each package's `style.css`, such as `comark-zoom/style.css`, with your own styles, so the page doesn't shift when the components mount.

Without a renderer, call `start()` from `comark-zoom/client` once on a page with `data-zoom` elements. It adds the styles and returns a function that stops it.

## Content Security Policy

The inlined `<style>` and `<script>` elements need `'unsafe-inline'` in `style-src` and `script-src`, or a hash of each. A script's text changes only between versions. Annotate also places marks with `style` attributes, so its pages need `style-src 'unsafe-inline'`.

To allow a script by hash without rendering a document first, hash the text a package exports. `mermaidScript` from `comark-ui/html` is the Mermaid buttons' script:

```ts
import { createHash } from "node:crypto";
import { mermaidScript } from "comark-ui/html";

const hash = `'sha256-${createHash("sha256").update(mermaidScript).digest("base64")}'`;
// Content-Security-Policy: script-src 'self' <hash>, plus the hash of each other script your documents use
```

Copy image draws the diagram from a `data:` image before it becomes a PNG, so the policy also needs `img-src data:`.

For any other script, render a document that uses it once, at startup, and hash the text between its `<script>` tags.

Notes, slides, and callouts are ordinary Markdown, so raw HTML in them renders like anywhere else in the document. For untrusted input, add Comark's `security` plugin and list the tags to drop, such as `security({ blockedTags: ["script", "style", "iframe"] })`.
