---
title: Footnotes
description: Footnotes in Markdown, with notes that hold any Markdown, in place of Comark's own plugin.
keywords: footnote, notes, endnotes, references, [^1]
tagline: 'Write [^1] where a note applies and [^1]: anywhere below, or the note itself as ^[text], and get numbered notes at the end of the page.'
group: Markdown syntax
icon: footprints
blurb: Numbered notes at the end of the page
credits: 'Syntax and parser from <a href="https://github.com/markdown-it/markdown-it-footnote">markdown-it-footnote</a>, and the nodes from Comark''s own footnotes plugin.'
---

::examples
:::example{label="References"}
```md
The deploy waits when the roof holds more than 12 pigeons[^count], unless it's a hotfix[^hotfix].

[^count]: Counted once, from the window, at 9:00.
[^hotfix]: A hotfix needs **two** approvals.
```
:::

:::example{label="Long notes"}
```md
Pizza is ordered on Fridays[^pizza].

[^pizza]: Pineapple needs a vote,
    and the vote needs two thirds.

    The order goes in at noon:

    - one margherita per four people
    - one diavola for the table
```
:::

:::example{label="Inline notes"}
```md
The retro moved to Thursday^[Friday is pizza day.], and the rubber duck^[A yellow one, on the second desk.] runs it.
```
:::
::

Notes are numbered in the order the text first references them and listed in a section at the end. A definition can run over indented lines and hold paragraphs, lists, and code. The nodes are the ones `comark/plugins/footnotes` writes, so styles and renderers made for it keep working.

## Usage

A reference is `[^label]` with no spaces in the label. Its definition starts a line with `[^label]:`, anywhere in the document:

```md
The duck has a name[^name].

[^name]: Gerald.
```

Notes are numbered in the order they're first referenced, whatever their labels. A note referenced twice lists a link back to each reference.

### Long notes

Lines indented by four spaces continue a definition, as in a list item, so a note can hold several paragraphs, a list, or code. A line that isn't indented continues the paragraph above it:

````md
[^deploy]: Deploys stop on Friday at noon
and start again on Monday.

    Hotfixes still ship:

    ```sh
    deploy --hotfix --approvers 2
    ```
````

Markdown in a note renders as it does anywhere else. The note's links back go at the end of its last paragraph.

### Inline notes

`^[text]` is a note written where it applies, with no label. It's numbered with the rest:

```md
Standup is at 9:30^[Unless the pigeons are counted late.].
```

### What stays text

A reference with no definition stays as written, `[^label]`, and a definition inside code is code. `[^text](https://…)` is a link.

## Examples

### Validation

A reference with no definition, a definition nothing references, and a label defined twice each add a sentence to `meta.issues` that names the label and says how to fix it. Each one has its own rule in [Doctor](/doctor/).

```txt
footnotes: [^gone] has no definition; add a "[^gone]: …" line, or remove the reference.
footnotes: [^spare]: is never referenced; add [^spare] where it applies, or remove the definition.
footnotes: [^1]: is defined more than once, and only the first shows; give the others their own labels, or remove them.
```

### From Comark's footnotes plugin

Swap the import; the options and the nodes are the same, so the classes `footnote-ref`, `footnotes`, `footnotes-list`, and `footnote-backref` and the ids `fn-label` and `fnref-label` don't change. Three things render differently:

- A definition inside fenced code stays in the code. Comark's plugin removes every `[^label]:` line before parsing, code included.
- Markdown in a note renders. Comark's plugin keeps the note as text, so `**bold**` stays as written.
- A note can run over several lines and blocks. Comark's plugin keeps the first line, and its indented lines become a code block in the page.

A reference used twice gets the id `fnref-label-2` the second time, where Comark's plugin repeats `fnref-label`, and its note gets a link back to each reference. A note of several blocks is an `li` holding `p` elements, with the links back inside the last one.

Comark's `Footnote` handler for `renderMarkdown` reads the same nodes, so it writes a note of one paragraph back to `[^label]: …`. A note of several blocks comes back as its first block only.

### Streaming

A stream renders notes as they arrive: `^[an unfinished note` already shows as a note, and `[^label]` shows as text until its definition arrives. Blocks Comark reuses from the last parse keep their notes.

## API

The options go under `footnotes` in `comarkUi()`, or to `footnotes()` when you use the plugin alone. They are Comark's, with the same defaults:

| Option | |
| --- | --- |
| `label` | The section's heading. Default `"Footnotes"`; `""` leaves the heading out. |
| `hr` | Whether a horizontal rule comes before the section. Default `true`. |
| `backRef` | The link from a note back to where it's referenced. Default `"↩"`. |

### Package

comark-ui brings `comark-footnotes` and registers it. To use it alone, install it and register it instead of `comark/plugins/footnotes`:

```sh
pnpm add comark @comark/html comark-footnotes
```

```ts
import { parseMarkdown } from "comark";
import footnotes from "comark-footnotes";

const document = await parseMarkdown(markdown, {
  plugins: [footnotes()],
});
```

It has no components, because the notes render as plain HTML. It is named `footnotes`, like Comark's plugin, so a list holds one or the other. When a list holds both, Comark keeps the first, so remove the import from `comark/plugins/footnotes` rather than adding this one after it.

It works with `registerDefaultPlugins: false` and in streaming parses.
