---
title: Critic
description: CriticMarkup in Markdown, shown as native ins, del, and mark, or accepted or rejected.
keywords: track changes, suggestions, suggest edits, redline, insertions, deletions, comments, proofreading
tagline: Suggested edits and comments written in the text, rendered with the changes shown, accepted, or rejected.
group: Markdown syntax
icon: file-pen-line
blurb: Suggested edits and comments
credits: 'Syntax from <a href="https://criticmarkup.com">CriticMarkup</a>, and the modes from <a href="https://facelessuser.github.io/pymdown-extensions/extensions/critic/">pymdownx.critic</a>.'
---

::examples
:::example{label="Suggested edits"}
```md
The deploy waits when more than {--twelve--}{++fifteen++} pigeons sit on the roof.

Count them {~~after~>before~~} the stand-up, from the {==east window==}{>>The west one faces the parking lot.<<}.

Pizza is on Friday{>>Pineapple still needs a vote.<<}.
```
:::
::

## Features

- Five marks: insertions, deletions, substitutions, highlights, and comments.
- Insertions, deletions, and highlights render as native `<ins>`, `<del>`, and `<mark>`.
- Each mark has a `ccm-` class, so its styles never reach a `~~strikethrough~~`.
- Text inside a mark is Markdown.
- `mode` renders the same Markdown with the changes made or undone.
- A mark left open stays as written and adds an issue.

## Usage

Write a mark inside a paragraph. It opens and closes in that paragraph.

```md
The deploy waits for {++fifteen++} pigeons.
```

### Insertion

Use `{++text++}` to suggest text to add. It renders as `<ins class="ccm-ins">`.

::example
```md
The deploy waits for {++fifteen++} pigeons.
```
::

### Deletion

Use `{--text--}` to suggest text to remove. It renders as `<del class="ccm-del">`.

::example
```md
The deploy waits for {--twelve--} pigeons.
```
::

### Substitution

Use `{~~old~>new~~}` to suggest replacing text. It renders as the deletion, then the insertion.

::example
```md
Count them {~~after~>before~~} the stand-up.
```
::

> [!NOTE]
> A substitution needs `~>` between the old and the new text.

### Highlight

Use `{==text==}` to point at a phrase. It renders as `<mark class="ccm-mark">`.

::example
```md
Count them from the {==east window==}.
```
::

### Comment

Use `{>>text<<}` to leave a note. It renders as `<span class="ccm-comment">`. Right after a highlight, it reads as a comment on the highlighted text.

::example
```md
Count them from the {==east window==}{>>Not the west one.<<}.
```
::

### Markdown inside

Use Markdown inside a mark to format its text. It can hold `**bold**`, `` `code` ``, and links.

::example
```md
The deploy waits for {++**fifteen**++} pigeons, counted with {++`count --roof`++}.
```
::

### Attributes

Use `{.class}` right after a mark to add attributes. The class joins the mark's own.

::example
```md
The deploy waits for {++fifteen++}{.urgent} pigeons.
```
::

### Mode

Use the `mode` option to render the document with the changes made or undone. `accept` makes every change and `reject` makes none. The default, `view`, shows them.

```ts
critic({ mode: "accept" });
```

`The deploy waits when more than {--twelve--}{++fifteen++} pigeons sit on the roof.` then renders as "The deploy waits when more than fifteen pigeons sit on the roof." [Modes](#modes) has what each mode does to each mark.

## Examples

### Review, then publish

Keep the suggestions in the source while a draft is in review, and render it twice. Use `mode: "view"` for the reviewers and `mode: "accept"` for the page you publish. The source stays one file, and nobody copies the accepted text by hand.

```ts
const review = await parseMarkdown(draft, { plugins: [critic()] });
const published = await parseMarkdown(draft, { plugins: [critic({ mode: "accept" })] });
```

Removing a word leaves the spaces around it, so `a {--big--} duck` accepts as `a  duck`. HTML collapses the two spaces into one.

### Write the characters themselves

Escape the brace, `\{++`, to write the characters themselves. Inside a code span, a mark stays as written.

```text
Type \{++ to open an insertion, or write `{++this++}` in code.
```

### Without the plugin

Comark reads a `{` in text as the start of attributes. Without this plugin, `{++fifteen++}` doesn't stay as text. The attribute rule takes the whole mark and renders nothing, so a suggestion vanishes from the page without a warning. The plugin's rule runs first and leaves every other brace, such as `{.class}` and `{#id}`, to Comark.

## API

### Syntax

| Mark | Markdown | Renders as |
| --- | --- | --- |
| Insertion | `{++added++}` | `<ins class="ccm-ins">added</ins>` |
| Deletion | `{--removed--}` | `<del class="ccm-del">removed</del>` |
| Substitution | `{~~old~>new~~}` | The deletion, then the insertion |
| Highlight | `{==this==}` | `<mark class="ccm-mark">this</mark>` |
| Comment | `{>>why<<}` | `<span class="ccm-comment">why</span>` |

### Options

The options go under `critic` in `comarkUi()`, or to `critic()` when you use the plugin alone.

| Option | Default | Description |
| --- | --- | --- |
| `mode` | `"view"` | `"view"` shows the changes, `"accept"` makes them, and `"reject"` undoes them. Any other value shows the changes and adds an issue. |

### Modes

| Mark | `view` | `accept` | `reject` |
| --- | --- | --- | --- |
| Insertion | `<ins>` | Its text | Nothing |
| Deletion | `<del>` | Nothing | Its text |
| Substitution | Both | The new text | The old text |
| Highlight | `<mark>` | Its text | Its text |
| Comment | The span | Nothing | Nothing |

### Issues

The plugin adds a sentence to `meta.issues` for each of these. Each one has its own rule in [Doctor](/doctor/).

- A mark with no closing half in its paragraph. The mark stays as written.
- A substitution without `~>`.
- A `mode` it doesn't know.

```txt
critic `{++` has no closing `++}` in its paragraph; close it there, or write `\{++` to keep the text.
critic `{~~old~~}` has no `~>` between the old and the new text; write `{~~old~>new~~}`.
critic: `mode` must be "view", "accept", or "reject", not "draft"; until then it shows the changes.
```

### Package

comark-ui brings `comark-critic` and registers it. To use it alone, install it and register the plugin:

```sh
pnpm add comark @comark/html comark-critic
```

```ts
import { parseMarkdown } from "comark";
import critic from "comark-critic";

const document = await parseMarkdown(markdown, {
  plugins: [critic()],
});
```

It has no components: insertions, deletions, and highlights are native tags that every renderer outputs as they are. It works with `registerDefaultPlugins: false` and in streaming parses.

## Theme

### Styles

The package's styles tint insertions green, strike deletions in red, highlight in amber, and draw comments as chips. Without them, the browser underlines `<ins>`, strikes `<del>`, and paints `<mark>` yellow, and comments are plain text. Import them with yours:

```ts
import "comark-critic/style.css";
```

Or inline the same styles from `css`:

```ts
import { css } from "comark-critic";
```

The plugin has no component to add them. comark-ui re-exports `css` as `criticCss` from every entry, so put it in the page.

### Shared tokens

Each mark carries a class, so the styles reach only CriticMarkup and not a `~~strikethrough~~`, which Comark also writes as `<del>`. An insertion is tinted green over a line, a deletion struck through in red, a highlight amber, and a comment a muted chip. They read these [shared tokens](/guide/theming/):

| Token | Used for |
| --- | --- |
| `--comark-accent` | The comment's chip |
| `--comark-border` | The chip's edge |
| `--comark-foreground` | A deletion's text, mixed with its red |
| `--comark-muted` | The comment's text |
| `--comark-radius` | Corners |

### Variables

The colors are variables of their own, read wherever they're set, on `:root` or any element around the marks. The deletion's red is shadcn/ui's `--destructive` when the page has it:

| Variable | Default |
| --- | --- |
| `--ccm-ins` | `--comark-success` |
| `--ccm-del` | `--comark-danger` |
| `--ccm-mark` | Amber |

### Example

The rules sit in a `comark` CSS layer, so any plain rule of your own wins. Recolor them as a pull request does, for instance:

```css
:root {
  --ccm-ins: #1a7f37;
  --ccm-del: #cf222e;
}
```

shadcn/ui before Tailwind 4 stores `--destructive` as bare HSL numbers, so map it as [Theming](/guide/theming/) does the shared tokens: `--comark-danger: hsl(var(--destructive))`.
