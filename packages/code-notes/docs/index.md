---
title: Code notes
description: Numbered notes on lines of code, written as comments and a list.
keywords: code annotations, annotated code, callouts, conums, line notes, code comments, AsciiDoc callouts
tagline: Numbered notes on lines of code, written as line-end comments and a list under the fence.
group: Review blocks
icon: message-square-code
blurb: Numbered notes on code lines
credits: 'After <a href="https://quarto.org/docs/authoring/code-annotation.html">Quarto</a>''s code annotation and <a href="https://docs.asciidoctor.org/asciidoc/latest/verbatim/callouts/">AsciiDoc</a>''s callouts.'
---

::examples
:::example{label="TypeScript"}
````md
```ts [src/pigeons.ts]
export async function countPigeons(plaza: string) {
  const res = await fetch(`/api/plazas/${plaza}/pigeons`) // <1>
  if (!res.ok) return 0 // <2>
  return (await res.json()).length
}
```

1. One request per plaza, so the map loads the counts in parallel.
2. A plaza the census hasn't reached yet counts as empty instead of failing the page.
````
:::

:::example{label="Python"}
````md
```py
ducks = load("pond.csv")  # <1>
ducks = ducks[ducks.seen > 0]  # <2>
```

1. The census, one row per duck.
2. Drop the ducks nobody has seen this year.
````
:::
::

## Features

- A numbered marker ties each note to the line it explains.
- The markers come from comments, so the code stays valid and copies clean.
- The notes are a plain Markdown list, readable where the plugin doesn't run.
- Each marker links to its note, and each note links back.
- Shiki highlights the code without the markers, and the output needs no script.

## Usage

End a line with a comment that holds its note's number in angle brackets. Write the notes as a numbered list right after the fence.

````md
```ts
const res = await fetch(url) // <1>
```

1. The note for that line.
````

A numbered marker replaces the comment.

### Markers

Write the marker in the fence language's comment. Any of these works in any fence, so pick one that keeps your code valid.

| Comment | Languages |
| --- | --- |
| `// <1>` | JavaScript, TypeScript, Go, Rust, C, Java, Swift, Kotlin |
| `# <1>` | Python, Ruby, shell, YAML, TOML |
| `-- <1>` | SQL, Lua, Haskell |
| `; <1>` and `% <1>` | Lisp, INI, assembly, LaTeX, Erlang |
| `/* <1> */` and `<!-- <1> -->` | CSS, HTML, XML, Vue |

A comment with words before the marker keeps them, so `// retry once <2>` shows `// retry once` and marker 2. A line can carry several markers, such as `// <1> <2>`, and two lines can share a number.

::example
````md
```ts
const res = await fetch(url) // retry once <1>
if (!res.ok) return 0 // <1> <2>
```

1. The census API fails about once a day, so one retry is enough.
2. A plaza the census hasn't reached yet counts as empty.
````
::

### Notes

The numbered list right after the fence holds the notes, and item 1 is note 1. Each note starts with its marker, which links back to the line.

Start the list at another number, such as `3.`, to number its notes from there.

::example
````md
```py
ducks = ducks[ducks.seen > 0]  # <3>
```

3. Drop the ducks nobody has seen this year.
````
::

> [!NOTE]
> Without a numbered list right after it, a fence keeps its markers as written. A ` ```md ` fence is never changed, since the markers in it belong to the fences it shows.

## Examples

### Notes in a pull request

Annotate the lines a reviewer would ask about, such as a parallel request, an early return, or a number from a benchmark. Keep each note to a sentence or two, and put longer explanations in the text around the block.

On GitHub, without the plugin, the comments show in the code and the notes as a numbered list under it.

### Plugin order

List `codeNotes()` after `shiki` in `plugins`, so Shiki highlights the code without the markers:

```ts
const render = createHtmlRenderer({ plugins: [shiki(), codeNotes(), code()], components });
```

In the other order the code isn't highlighted, and `meta.issues` says to move it. Without Shiki, the plugin draws the lines itself.

### With comark-code

[comark-code](/code/) adds a bar of buttons to each block. CSS draws the marker's number, so Copy takes only the code.

## Accessibility

Each marker in the code is a link named "Note 1", and each note starts with a link named "Back to marker 1". A marker with no note is plain text. The note a link jumps to is highlighted.

### Keyboard interactions

| Key | Description |
| --- | --- |
| `Tab` | Moves focus to the next marker or note link. |
| `Enter` | Follows the focused link, from a marker to its note or from a note back to its marker. |

## API

### Options

The plugin takes no options. In `comarkUi()`, `codeNotes: false` turns it off.

### Issues

The plugin adds these problems to `meta.issues`, as [Validation](/guide/validation/) describes:

- A fence has markers but no numbered list after it.
- A marker has no note.
- A note has no marker.
- `shiki` runs after the plugin.

Each names its fence and the fix, and has its own rule in [Doctor](/doctor/):

```txt
The ```ts fence 2: marker <3> has no note, since the list after it has 2 items. Add its note, or remove the marker.
The ```py fence 1 has markers like `<1>` but no numbered list right after it, so they stay in the code. Write the notes as a numbered list right after the fence.
```

### Package

[comark-ui](/getting-started/) installs and registers `comark-code-notes`. To use it alone, install it and pass the renderer's `components`:

```sh
pnpm add comark @comark/html comark-code-notes
```

```ts
import { createHtmlRenderer } from "@comark/html";
import shiki from "@comark/html/plugins/shiki";
import codeNotes, { components } from "comark-code-notes/html";

const render = createHtmlRenderer({ plugins: [shiki(), codeNotes()], components });
```

Register `codeNotes()` after `shiki()`, as [Plugin order](#plugin-order) explains.

For Vue, React, or Svelte, import from `comark-code-notes/vue`, `comark-code-notes/react`, or `comark-code-notes/svelte`. The components add the styles on mount. Import `comark-code-notes/style.css` with your styles so a server-rendered page doesn't shift. [Renderers](/guide/renderers/) covers using it with other plugins.

## Theme

Markers are round badges tinted with the primary color, with the number in that color. The rules sit in a `comark` CSS layer, so any plain rule of yours wins, except the few that keep a page's `a`, `ol`, and paragraph rules from breaking the markers and the notes' alignment.

### Shared tokens

Markers and notes read these [shared tokens](/guide/theming/):

| Token | Used for |
| --- | --- |
| `--comark-primary` | Markers |
| `--comark-background` | Mixed into a marker's tint |
| `--comark-accent` | The note a link jumped to |
| `--comark-ring` | Focus rings, and the marker a link jumped to |
| `--comark-radius` | The highlighted note's corners |
| `--comark-font` | A marker's number |

### Variables

Set them on `.cn-marker`:

| Variable | Default | Used for |
| --- | --- | --- |
| `--cn-marker` | `--comark-primary` | A marker's color: its tint and its edge |
| `--cn-marker-text` | `--cn-marker` | A marker's number |

### Classes

A marker is `.cn-marker`, with its number in `data-note`. The notes are `ol.cn-notes`, and each `li` holds its marker and a `div` with the note. `:target` highlights the note a link jumps to.
