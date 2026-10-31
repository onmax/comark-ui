---
title: Sources
description: Numbered citations and the list of sources they point at, written in Markdown.
keywords: citation, cite, references, bibliography, footnote, works cited
tagline: Numbered citations that link to a list of sources, and back.
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

## Features

- `:cite[1]` cites a source by its number, and `:cite[1,3]` cites several.
- Each citation links to its source. Resting the pointer on it, or focusing it, shows a card with the source's title, its site, and the site's icon.
- Each source links back to every place it's cited.
- A citation of a source the list doesn't have is an issue, not a dead link.
- The citations are plain `sup` links, so they work in any renderer.

## Usage

Cite a source with `:cite[n]`, and list the sources in `::sources`.

```md
Pigeons find home by the sun :cite[1].

::sources
1. [Magnetoreception](https://en.wikipedia.org/wiki/Magnetoreception)
::
```

`:cite[n]` cites the nth source. It becomes a superscript `[1]` that links to its source in the list.

A `::sources` holds one numbered list, and each item is one source with its link. The list renders where the block sits. Each item gets a ↩ link back to each citation of it, numbered ↩1, ↩2 when it's cited more than once.

> [!NOTE]
> A document has one list of sources.

### Several sources

Write the numbers with commas between them to cite several sources at once.

```md
Homing works by the sun :cite[1], and by smell :cite[2,3].

::sources
1. [Magnetoreception](https://en.wikipedia.org/wiki/Magnetoreception)
2. [Pigeon intelligence](https://en.wikipedia.org/wiki/Pigeon_intelligence), on smell
3. [How do homing pigeons navigate?](https://www.sciencefocus.com/nature/how-do-homing-pigeons-navigate)
::
```

### Card

Rest the pointer on a citation, or move to it with the keyboard, and a card shows its source: the site's icon, the site, and the title. The card stays open while the pointer moves onto it, and a click on it opens the source. Escape closes it. On a touch screen, a tap follows the citation to the list instead.

The icon is the one the list shows. [comark-chips](/chips/) gives each link in the list its site's favicon, or an account's avatar, and comark-ui turns it on. When the list shows no icon, the card shows a globe.

Without the script, such as in a feed reader, the browser shows the source's title as the citation's tooltip.

### Title

Use the `title` prop to set the small title above the list.

```md
Homing works by the sun :cite[1].

::sources{title="References"}
1. [Magnetoreception](https://en.wikipedia.org/wiki/Magnetoreception)
::
```

## Examples

### Sources in agent-written documents

An agent that researches a change can cite as it writes and list its links once at the end. The plugin checks what readers can't: every citation points at a source that exists. Reject a document whose `meta.issues` isn't empty, as [Validation](/guide/validation/) describes. The agent gets back a sentence such as "`:cite` 3 cites source 4, but `::sources` lists 3" to fix it with.

## API

### Props

| Prop | Default | Description |
| --- | --- | --- |
| `title` | `"Sources"` | The title above the list, which also names it for screen readers. |

### Options

The plugin takes no options. `sources: false` in `comarkUi()` turns it off.

### Issues

The plugin adds these problems to `meta.issues`, as [Validation](/guide/validation/) describes:

- A citation with no number.
- A citation of a source the list doesn't have.
- Citations with no `::sources`.
- A second `::sources`.
- A list item without a link.
- Content beside the list. It's dropped.
- A prop it doesn't read.

Each issue names its block and says how to fix it, and each has its own rule in [Doctor](/doctor/).

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

For Vue, React, or Svelte, import from `comark-sources/vue`, `comark-sources/react`, or `comark-sources/svelte`. The components add the styles and start the card when they mount. Import `comark-sources/style.css` with your styles so a server-rendered page doesn't shift. [Renderers](/guide/renderers/) covers using it with other plugins.

## Theme

Citations and sources read the [shared tokens](/guide/theming/). The rules sit in a `comark` CSS layer, so any plain rule of your own wins. The card sits at the end of the page and takes the tokens its citation sees, so a theme set on the document's container reaches it too.

### Shared tokens

| Token | Used for |
| --- | --- |
| `--comark-background` | The card |
| `--comark-foreground` | Links, the list's title, and the card's title |
| `--comark-muted` | The list, the citations, and the card's site |
| `--comark-border` | The rule above the list, and the card's edge |
| `--comark-accent` | Behind a source just jumped to |
| `--comark-ring` | Focus rings |
| `--comark-radius` | The corners of the card, a focus ring, and a source just jumped to |
| `--comark-font` | The list and the card |

### Classes

| Class | Element |
| --- | --- |
| `.cso-cite` | A citation's `sup` |
| `.cso` | The sources' `section` |
| `.cso-title` | Its title |
| `.cso-back` | A link back to a citation |
| `.cso-card` | The card, a popover the script adds at the end of the page |
| `.cso-card-site` | Its row with the icon and the site |
| `.cso-card-title` | Its title |
