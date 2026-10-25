---
title: Footnotes
description: Footnotes in Markdown, with notes that hold any Markdown, in place of Comark's own plugin.
keywords: footnote, notes, endnotes, references, [^1]
tagline: Numbered notes listed at the end of the page, written as references and definitions or inline.
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

## Features

- Notes are numbered in the order the text first references them, whatever their labels.
- They're listed in a section at the end of the page.
- A definition can run over indented lines and hold paragraphs, lists, and code.
- `^[text]` writes a note where it applies, with no label.
- The nodes are the ones `comark/plugins/footnotes` writes, so styles and renderers made for it keep working.

## Usage

Write `[^label]` where a note applies, with no spaces in the label. Start its definition on a line with `[^label]:`, anywhere in the document.

::example
```md
The duck has a name[^name].

[^name]: Gerald.
```
::

### Long notes

Use lines indented by four spaces to continue a definition, as in a list item. A note can then hold several paragraphs, a list, or code. A line that isn't indented continues the paragraph above it.

::example
````md
Deploys pause on Fridays[^deploy].

[^deploy]: Deploys stop on Friday at noon
and start again on Monday.

    Hotfixes still ship:

    ```sh
    deploy --hotfix --approvers 2
    ```
````
::

Markdown in a note renders as it does anywhere else. The note's links back go at the end of its last paragraph.

### Inline notes

Use `^[text]` to write a note where it applies, with no label. It's numbered with the rest.

::example
```md
Standup is at 9:30^[Unless the pigeons are counted late.].
```
::

### Repeated references

Use the same `[^label]` twice to point at one note from two places. The note lists a link back to each reference.

::example
```md
The duck[^duck] reviews every pull request. Ask the duck[^duck] first.

[^duck]: The yellow one, on the second desk.
```
::

### Heading

Use the `label` option to change the section's heading. `""` leaves the heading out.

```ts
footnotes({ label: "Notes" });
```

### Rule

Use the `hr` option to leave out the horizontal rule before the section.

```ts
footnotes({ hr: false });
```

### Back link

Use the `backRef` option to change the link from a note back to where it's referenced.

```ts
footnotes({ backRef: "Back" });
```

## Examples

### What stays text

A reference with no definition stays as written, `[^label]`, and a definition inside code is code. `[^text](https://…)` is a link.

### From Comark's footnotes plugin

Swap the import. The options and the nodes are the same, so these don't change:

- the classes `footnote-ref`, `footnotes`, `footnotes-list`, and `footnote-backref`
- the ids `fn-label` and `fnref-label`

Three things render differently:

- A definition inside fenced code stays in the code. Comark's plugin removes every `[^label]:` line before parsing, code included.
- Markdown in a note renders. Comark's plugin keeps the note as text, so `**bold**` stays as written.
- A note can run over several lines and blocks. Comark's plugin keeps the first line, and its indented lines become a code block in the page.

A reference used twice gets the id `fnref-label-2` the second time, where Comark's plugin repeats `fnref-label`, and its note gets a link back to each reference. A note of several blocks is an `li` holding `p` elements, with the links back inside the last one.

Comark's `Footnote` handler for `renderMarkdown` reads the same nodes, so it writes a note of one paragraph back to `[^label]: …`. A note of several blocks comes back as its first block only.

### Streaming

A stream renders notes as they arrive. `^[an unfinished note` already shows as a note, and `[^label]` shows as text until its definition arrives. Blocks Comark reuses from the last parse keep their notes.

## API

### Options

The options go under `footnotes` in `comarkUi()`, or to `footnotes()` when you use the plugin alone. They are Comark's, with the same defaults.

| Option | Default | Description |
| --- | --- | --- |
| `label` | `"Footnotes"` | The section's heading. `""` leaves the heading out. |
| `hr` | `true` | Whether a horizontal rule comes before the section. |
| `backRef` | `"↩"` | The link from a note back to where it's referenced. |

### Issues

The plugin adds a sentence to `meta.issues` for each of these, naming the label and saying how to fix it. Each one has its own rule in [Doctor](/doctor/).

- A reference with no definition.
- A definition nothing references.
- A label defined twice. Only the first definition shows.

```txt
footnotes: [^gone] has no definition; add a "[^gone]: …" line, or remove the reference.
footnotes: [^spare]: is never referenced; add [^spare] where it applies, or remove the definition.
footnotes: [^1]: is defined more than once, and only the first shows; give the others their own labels, or remove them.
```

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
