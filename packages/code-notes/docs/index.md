---
title: Code notes
description: Numbered notes on lines of code, written as comments and a list.
keywords: code annotations, annotated code, callouts, conums, line notes, code comments, AsciiDoc callouts
tagline: End a line of code with a numbered comment like `// <1>`, write the notes as a numbered list under the fence, and each marker links to its note and back.
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

A reviewer reads a change line by line, and a note beside the line it explains is easier to follow than a paragraph above the block. The markers come from comments, so the code stays valid and copies clean, and the notes are an ordinary Markdown list that reads fine where the plugin doesn't run.

## Usage

### Markers

End a line with a comment that holds its note's number in angle brackets:

````md
```ts
const res = await fetch(url) // <1>
```

1. The note for that line.
````

The comment goes away and a numbered marker takes its place. A comment with words before the marker keeps the words: `// retry once <2>` shows `// retry once` and marker 2. A line can carry several markers, such as `// <1> <2>`, and two lines can share a number.

| Comment | Languages |
| --- | --- |
| `// <1>` | JavaScript, TypeScript, Go, Rust, C, Java, Swift, Kotlin |
| `# <1>` | Python, Ruby, shell, YAML, TOML |
| `-- <1>` | SQL, Lua, Haskell |
| `; <1>` and `% <1>` | Lisp, INI, assembly, LaTeX, Erlang |
| `/* <1> */` and `<!-- <1> -->` | CSS, HTML, XML, Vue |

The plugin accepts any of these in any fence, so pick the one that keeps your code valid.

### Notes

The numbered list right after the fence holds the notes: item 1 is note 1. Each note starts with its marker, which links back to the line, and each marker in the code links to its note. A list that starts at another number, such as `3.`, numbers its notes from there.

Without a numbered list right after it, a fence keeps its markers as written. A ` ```md ` fence is never changed, since the markers in it belong to the fences it shows.

### Issues

The plugin adds every problem to `meta.issues`, as [Validation](/guide/validation/) describes: a fence with markers but no list after it, a marker with no note, a note with no marker, and `shiki` running after the plugin. Each issue names its fence and says how to fix it, and each has its own rule in [Doctor](/doctor/):

```txt
The ```ts fence 2: marker <3> has no note, since the list after it has 2 items. Add its note, or remove the marker.
The ```py fence 1 has markers like `<1>` but no numbered list right after it, so they stay in the code. Write the notes as a numbered list right after the fence.
```

## Examples

### Notes in a pull request

Annotate the lines a reviewer would ask about: the request that runs in parallel, the case that returns early, the number that came from a benchmark. Keep each note to a sentence or two; a longer explanation belongs in the text around the block.

The source stays readable without the plugin. On GitHub, the comments show in the code and the notes as a numbered list under it.

### Plugin order

The plugin takes the markers out of the code before any plugin runs, so Shiki highlights the code without them. It draws the markers back once the tree is built, into the lines Shiki wrote, so it has to come after `shiki` in `plugins`:

```ts
const render = createHtmlRenderer({ plugins: [shiki(), codeNotes(), code()], components });
```

In the other order the code isn't highlighted, and `meta.issues` says to move it.

### With comark-code

[comark-code](/code/) wraps each block in its bar of buttons, and the markers sit inside the code it wraps. The marker's number is drawn by CSS, so Copy takes only the code. The two are separate packages because the notes need nothing from the buttons: comark-code replaces `pre`, and this plugin only adds markers to its lines and turns the list under it into notes.

## API

The plugin takes no options. In `comarkUi()`, `codeNotes: false` turns it off.

### Package

[comark-ui](/getting-started/) brings `comark-code-notes` and registers it. To use it alone, install it, register it after Comark's `shiki`, and pass the renderer's `components`:

```sh
pnpm add comark @comark/html comark-code-notes
```

```ts
import { createHtmlRenderer } from "@comark/html";
import shiki from "@comark/html/plugins/shiki";
import codeNotes, { components } from "comark-code-notes/html";

const render = createHtmlRenderer({ plugins: [shiki(), codeNotes()], components });
```

The markers are drawn into the lines Shiki writes, so `codeNotes()` goes after `shiki()`. In the other order, the annotated code isn't highlighted and the plugin reports it. Without Shiki, it draws the lines itself.

The renderer inlines the styles once per document, and the output needs no script. For Vue, React, or Svelte, import from `comark-code-notes/vue`, `comark-code-notes/react`, or `comark-code-notes/svelte`; the components add the styles when they mount. Import `comark-code-notes/style.css` with your styles so a server-rendered page doesn't shift. It works with [comark-code](/code/)'s buttons, whose Copy leaves the markers out. [Renderers](/guide/renderers/) covers using it with other plugins.

## Theme

Markers are round badges in a soft tint of shadcn/ui's `--primary` when the page has it, or of the foreground color otherwise, with the number in that color. Each note starts with its marker. The rules sit in a `comark` CSS layer, so any plain rule of your own wins, except the few that keep a page's `a`, `ol`, and paragraph rules from breaking the markers and the notes' alignment.

### Shared tokens

Markers and notes read these [shared tokens](/guide/theming/):

| Token | Used for |
| --- | --- |
| `--comark-foreground` | Markers, when the page has no `--primary` |
| `--comark-background` | Mixed into a marker's tint |
| `--comark-accent` | The note a link jumped to |
| `--comark-ring` | Focus rings, and the marker a link jumped to |
| `--comark-radius` | The highlighted note's corners |
| `--comark-font` | A marker's number |

### Variables

Set them on `.cn-marker`:

| Variable | Default | Used for |
| --- | --- | --- |
| `--cn-marker` | shadcn/ui's `--primary`, else `--comark-foreground` | A marker's color: its tint and its edge |
| `--cn-marker-text` | `--cn-marker` | A marker's number |

### Classes

A marker is `.cn-marker`, with its number in `data-note`, drawn by CSS so copying the code leaves it out. The notes are `ol.cn-notes`; each `li` holds its marker and a `div` with the note. The note a link jumps to is highlighted with `:target`.
