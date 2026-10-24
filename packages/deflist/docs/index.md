---
title: Definition lists
description: Definition lists in Markdown, rendered as native dl, dt, and dd.
keywords: definition list, description list, glossary, terms, dictionary, dl, dt, dd
tagline: Write a term, then its definition on a line that starts with a colon, and get a glossary with no component and no styles.
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

A term sits on one line and each definition starts with `:` or `~` and a space. Indented lines continue a definition, so it can hold paragraphs, lists, and code. The list renders as plain `<dl>`, `<dt>`, and `<dd>`, which your page's styles already cover.

## Usage

A term is one line. The line after it, or the one after a blank line, starts with `:` or `~` and at least one space:

```md
Retro
: A meeting about the sprint that just ended.
~ A font that looks like 1984.
```

A term can have several definitions, and a list several terms. Separate terms with a blank line, or a line right after a definition is read as more of that definition.

### Long definitions

Lines indented past the marker continue the definition. Leave a blank line between its blocks, as in a list item:

````md
Deploy freeze
:   No deploys from Friday noon to Monday.

    Hotfixes still ship, with two approvals.

    ```sh
    deploy --hotfix --approvers 2
    ```
````

### Tight and loose

A definition holding one paragraph renders its text straight inside `<dd>`. With more blocks, each paragraph keeps its `<p>`. With Comark's `autoUnwrap: false`, a loose list keeps `<p>` in every definition. A list is loose when a blank line sits inside a definition or between a term and its definition.

### What isn't a definition

A colon with no space after it, such as `:3 to 1` or a `:component`, stays text, and so does a `: line` with no term above it or one indented four spaces past the term. A marker with nothing after it is an empty definition.

## Examples

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

### How it parses

The parser is markdown-it-deflist, ported so its tokens reach Comark's tree: Comark drops block tokens it doesn't know, so the plugin pushes ones it builds with any tag.

## API

The plugin takes no options. In `comarkUi()`, `deflist: false` turns it off.

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

It has no components and no styles, because a definition list is native HTML. It works with `registerDefaultPlugins: false`, in streaming parses, and inside any `::component`. Every renderer draws the nodes as they are: `dl`, `dt`, and `dd`.
