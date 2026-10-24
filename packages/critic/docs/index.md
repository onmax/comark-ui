---
title: Critic
description: CriticMarkup in Markdown, shown as native ins, del, and mark, or accepted or rejected.
keywords: track changes, suggestions, suggest edits, redline, insertions, deletions, comments, proofreading
tagline: Suggest an edit right in the text, comment on a phrase, and render the page with the changes shown, accepted, or rejected.
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

Insertions render as `<ins>`, deletions as `<del>`, highlights as `<mark>`, and comments as a small muted span. Set `mode` to `accept` or `reject` to render the same Markdown with the changes made or undone.

## Usage

| Mark | Markdown | Renders as |
| --- | --- | --- |
| Insertion | `{++added++}` | `<ins class="ccm-ins">added</ins>` |
| Deletion | `{--removed--}` | `<del class="ccm-del">removed</del>` |
| Substitution | `{~~old~>new~~}` | the deletion, then the insertion |
| Highlight | `{==this==}` | `<mark class="ccm-mark">this</mark>` |
| Comment | `{>>why<<}` | `<span class="ccm-comment">why</span>` |

A highlight followed by a comment, `{==east window==}{>>Not the west one.<<}`, reads as a comment on the highlighted text. Text inside a mark is Markdown, so it can hold `**bold**`, `` `code` ``, and links, and `{.class}` right after a mark adds its attributes, next to the mark's own class.

Each mark opens and closes in one paragraph. Inside a code span it stays as written.

### Modes

| Mark | `view` | `accept` | `reject` |
| --- | --- | --- | --- |
| Insertion | `<ins>` | its text | nothing |
| Deletion | `<del>` | nothing | its text |
| Substitution | both | the new text | the old text |
| Highlight | `<mark>` | its text | its text |
| Comment | the span | nothing | nothing |

### Issues

A mark with no closing half in its paragraph stays as written, and the plugin adds a sentence to `meta.issues`, as it does for a substitution without `~>` and a `mode` it doesn't know. Each one has its own rule in [Doctor](/doctor/):

```txt
critic `{++` has no closing `++}` in its paragraph; close it there, or write `\{++` to keep the text.
critic `{~~old~~}` has no `~>` between the old and the new text; write `{~~old~>new~~}`.
```

Escape the brace, `\{++`, to write the characters themselves.

## Examples

### Review, then publish

Keep the suggestions in the source while a draft is in review, and render it twice: once with `mode: "view"` for the reviewers, and once with `mode: "accept"` for the page you publish. The source stays one file, and nobody copies the accepted text by hand.

```ts
const review = await parseMarkdown(draft, { plugins: [critic()] });
const published = await parseMarkdown(draft, { plugins: [critic({ mode: "accept" })] });
```

Removing a word leaves the spaces around it, so `a {--big--} duck` accepts as `a  duck`. HTML collapses the two spaces into one.

### Without the plugin

Comark reads a `{` in text as the start of attributes. Without this plugin, `{++fifteen++}` doesn't stay as text: the attribute rule takes the whole mark and renders nothing, so a suggestion vanishes from the page without a warning. The plugin's rule runs first and leaves every other brace, such as `{.class}` and `{#id}`, to Comark.

## API

The options go under `critic` in `comarkUi()`, or to `critic()` when you use the plugin alone.

### Options

`critic({ mode: "accept" })` renders the document with every change made, and `mode: "reject"` with none of them. The default, `"view"`, shows them. [Modes](/critic/#modes) has what each mode does to each mark.

### Styles

The package's styles tint insertions green, strike deletions in red, highlight in amber, and draw comments as chips. Without them, the browser underlines `<ins>`, strikes `<del>`, and paints `<mark>` yellow, and comments are plain text. Import them with yours:

```ts
import "comark-critic/style.css";
```

Or inline the same styles from `css`:

```ts
import { css } from "comark-critic";
```

The plugin has no component to add them, so comark-ui re-exports `css` as `criticCss` from every entry; put it in the page.

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

Each mark carries a class, so the styles reach only CriticMarkup and not a `~~strikethrough~~`, which Comark also writes as `<del>`. An insertion is tinted green over a line, a deletion struck through in red, a highlight amber, and a comment a muted chip. They read these [shared tokens](/guide/theming/):

| Token | Used for |
| --- | --- |
| `--comark-accent` | The comment's chip |
| `--comark-border` | The chip's edge |
| `--comark-foreground` | A deletion's text, mixed with its red |
| `--comark-muted` | The comment's text |
| `--comark-radius` | Corners |

The colors are variables of their own, read wherever they're set, on `:root` or any element around the marks. The deletion's red is shadcn/ui's `--destructive` when the page has it:

| Variable | Default |
| --- | --- |
| `--ccm-ins` | Green |
| `--ccm-del` | `--destructive`, else red |
| `--ccm-mark` | Amber |

The rules sit in a `comark` CSS layer, so any plain rule of your own wins. Recolor them as a pull request does, for instance:

```css
:root {
  --ccm-ins: #1a7f37;
  --ccm-del: #cf222e;
}
```

shadcn/ui before Tailwind 4 stores `--destructive` as bare HSL numbers, so map it as [Theming](/guide/theming/) does the shared tokens: `--ccm-del: hsl(var(--destructive))`.
