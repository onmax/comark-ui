---
title: Sources
description: Numbered citations and the list of sources they point at, written in Markdown.
keywords: citation, cite, references, bibliography, footnote, works cited
tagline: Cite a source inline with a number, list the sources at the end, and each citation links to its source and back.
group: Review blocks
icon: quote
blurb: Citations and a list of sources
credits: 'After <a href="https://ai-sdk.dev/elements">AI Elements</a>'' Sources and Inline Citation.'
---

::examples
:::example{label="Citations"}
```md
Pigeons find home by the sun and by the earth's magnetic field :cite[1], and some by smell too :cite[2,3].

::sources
1. [Magnetoreception in homing pigeons](https://en.wikipedia.org/wiki/Magnetoreception)
2. [Olfactory navigation](https://en.wikipedia.org/wiki/Pigeon_intelligence)
3. [How do homing pigeons navigate?](https://www.sciencefocus.com/nature/how-do-homing-pigeons-navigate)
::
```
:::
::

Each source links back to every place it's cited, and each citation shows its source's title on hover. A citation of a source the list doesn't have is an issue, not a dead link, which matters when an agent writes the document and the numbers drift.

## Usage

### Citations

```md
Homing works by the sun :cite[1], and by smell :cite[2,3].
```

`:cite[n]` cites the nth source; `:cite[1,3]` cites several. Each becomes a superscript `[1]` that links to its source and shows the source's title on hover.

### Sources

```md
::sources{title="References"}
1. [Magnetoreception](https://en.wikipedia.org/wiki/Magnetoreception)
2. [Pigeon intelligence](https://en.wikipedia.org/wiki/Pigeon_intelligence), on smell
::
```

A `::sources` holds one numbered list, and each item is one source with its link. The list renders where the block sits, under a small title, `title` or "Sources", and each item gets a ↩ link back to each citation of it. A document has one list of sources.

The plugin adds every problem to `meta.issues`, as [Validation](/guide/validation/) describes: a citation with no number, one of a source the list doesn't have, citations with no `::sources`, a second `::sources`, a list item without a link, content beside the list (it's dropped), and a prop it doesn't read. Each issue names its block and says how to fix it. Each one has its own rule in [Doctor](/doctor/).

## Examples

### Sources in agent-written documents

An agent that researches a change can cite as it writes and list its links once at the end. The plugin checks what readers can't: every citation points at a source that exists. Reject a document whose `meta.issues` isn't empty, as [Validation](/guide/validation/) describes, and the agent gets back a sentence such as "`:cite` 3 cites source 4, but `::sources` lists 3" to fix it with.

## API

The plugin takes no options. `sources: false` in `comarkUi()` turns it off.

### Package

comark-ui brings `comark-sources` and registers it. To use it alone, install it with Comark and a renderer:

```sh
pnpm add comark @comark/html comark-sources
```

Register the plugin and pass the renderer's `components`:

```ts
import { createHtmlRenderer } from "@comark/html";
import sources, { components } from "comark-sources/html";

const render = createHtmlRenderer({ plugins: [sources()], components });
```

For Vue, React, or Svelte, import from `comark-sources/vue`, `comark-sources/react`, or `comark-sources/svelte`; the components add the styles when they mount. Import `comark-sources/style.css` with your styles so a server-rendered page doesn't shift. [Renderers](/guide/renderers/) covers using it with other plugins.

The citations are plain `sup` links, so they work in any renderer; the component draws the list and carries the styles for both.

## Theme

Citations and sources read the [shared tokens](/guide/theming/): `--comark-foreground` for links and the title, `--comark-muted` for the list and the markers, `--comark-border` for the rule above the list, `--comark-accent` behind a source just jumped to, `--comark-ring` for focus rings, `--comark-radius` for the corners of both, and `--comark-font`. The rules sit in a `comark` CSS layer, so any plain rule of your own wins.

| Class | Element |
| --- | --- |
| `.cso-cite` | A citation's `sup` |
| `.cso` | The sources' `section` |
| `.cso-title` | Its title |
| `.cso-back` | A link back to a citation |
