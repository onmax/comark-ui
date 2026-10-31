---
title: Definition lists
description: Definition lists in Markdown, rendered as native dl, dt, and dd.
keywords: definition list, description list, glossary, terms, dictionary, dl, dt, dd
tagline: A list of terms and their definitions, written as a term and a line that starts with a colon.
group: Markdown syntax
icon: book-a
blurb: Terms and their definitions
credits: 'Ported from <a href="https://github.com/markdown-it/markdown-it-deflist">markdown-it-deflist</a>, after <a href="https://pandoc.org/MANUAL.html#definition-lists">Pandoc</a>''s and PHP Markdown Extra''s syntax.'
---

::examples
:::example{label="Glossary"}
```md
Flaky test
: A test that passes and fails on the same code.

Rubber duck
: A listener who doesn't need to understand the bug.
: A bath toy.
```
:::

:::example{label="Long definitions"}
```md
Pigeon count
:   The number of pigeons on the office roof at 9:00.

    Above 12, the deploy waits. Below 12, it ships.

    - Count once, from the window.
    - Pigeons that fly off mid-count still count.

Pizza vote
:   Fridays at noon. Pineapple needs two thirds.
```
:::
::

## Features

- A term on one line, its definition on a line that starts with `:` or `~`.
- A term can have several definitions, and a list several terms.
- Indented lines continue a definition, so it can hold paragraphs, lists, and code.
- The list renders as native `<dl>`, `<dt>`, and `<dd>`, which your page's styles already cover.
- No classes, no styles, and no components.

## Usage

Write a term on one line. Start the line after it with `:` and at least one space.

::example
```md
Retro
: A meeting about the sprint that just ended.
```
::

### Tilde marker

Use `~` instead of `:` to start a definition. Both render the same.

::example
```md
Retro
~ A meeting about the sprint that just ended.
```
::

### Several definitions

Use one marker line per definition to give a term several meanings.

::example
```md
Retro
: A meeting about the sprint that just ended.
~ A font that looks like 1984.
```
::

### Several terms

Use a blank line between terms to put several in one list.

::example
```md
Retro
: A meeting about the sprint that just ended.

Stand-up
: A meeting held standing, so it stays short.
```
::

> [!NOTE]
> A line right after a definition is read as more of that definition. Leave a blank line before the next term.

### Long definitions

Use lines indented past the marker to continue a definition. Leave a blank line between its blocks, as in a list item.

::example
````md
Deploy freeze
:   No deploys from Friday noon to Monday.

    Hotfixes still ship, with two approvals.

    ```sh
    deploy --hotfix --approvers 2
    ```
````
::

### Empty definition

Use a marker with nothing after it to leave a definition empty. Keep another term after it; a lone `:` at the end of the document requires Comark's `autoClose: false`.

```md
TBD
:

Ready
: Approved for the next deploy.
```

## Examples

### Tight and loose

A definition holding one paragraph renders its text straight inside `<dd>`. With more blocks, each paragraph keeps its `<p>`. A list is loose when a blank line sits inside a definition or between a term and its definition. With Comark's `autoUnwrap: false`, a loose list keeps `<p>` in every definition.

### What isn't a definition

A colon with no space after it stays text, such as `:3 to 1` or a `:component`. So does a `: line` with no term above it, or one indented four spaces past the term.

```md
The odds were
:3 to 1
```

### Styling

The plugin adds no classes and no styles. Browsers indent `<dd>`, and a prose stylesheet such as Tailwind Typography styles all three tags. To set terms in bold:

```css
dt {
  font-weight: 600;
}
dd + dt {
  margin-top: 1em;
}
```

### Lists or tables

A definition list reads better than a two-column table when definitions run longer than a line or hold more than a paragraph, since a table cell holds neither a list nor code. For short values side by side, such as options and defaults, a table is easier to scan.

## API

### Syntax

| Form | Markdown | Renders as |
| --- | --- | --- |
| Term | A line followed by a definition | `<dt>` |
| Definition | `: text` or `~ text`, with at least one space after the marker | `<dd>` |
| Continuation | Lines indented past the marker | More of the `<dd>` |
| List | Terms and definitions in a row | `<dl>` |

### Options

The plugin takes no options. `deflist: false` in `comarkUi()` turns it off.

### Package

comark-ui brings `comark-deflist` and registers it. To use it alone, install it and register the plugin:

```sh
pnpm add comark @comark/html comark-deflist
```

```ts
import { parseMarkdown } from "comark";
import deflist from "comark-deflist";

const document = await parseMarkdown(markdown, {
  plugins: [deflist()],
});
```
