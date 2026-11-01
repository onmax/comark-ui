---
title: Typeset
description: The text around the blocks, styled out of the box on the same tokens as the blocks, for Nuxt UI, shadcn/ui, or a page with neither.
keywords: prose, typography, Tailwind Typography, shadcn typeset, CSS, fonts, spacing, headings, tables, base styles, reset
tagline: Headings, paragraphs, lists, tables, code, and quotes look finished with no CSS of your own, and match the blocks beside them.
---

comark-ui styles the text around the blocks to match them. Here's how to change that or turn it off.

## What it styles

comark-ui styles a document's plain Markdown: headings, paragraphs, links, lists and task lists, tables, inline code and code blocks, quotes, footnotes, images, and definition lists. The rules are [shadcn/typeset](https://ui.shadcn.com/docs/typeset) on the blocks' `--comark-*` tokens.

- **On by default.** Every `comark-ui` renderer writes them.
- **Scoped to the document.** A `<style>` inside the document uses `@scope`, so it styles only the element the document renders into.
- **In the server's HTML.** Vue, React, and Svelte render the `<style>` with the document, so a server-rendered page arrives styled and doesn't shift.
- **With a grain.** A faint noise covers the background. `--comark-grain: none` turns it off.
- **Under the blocks.** The rules sit in a `typeset` layer inside the `comark` layer, so block rules win over them, and your plain rules win over both.

The styles need `@scope`, which every current browser has. An older one shows its default text styles, and the blocks still render.

## Your site's theme

The text reads the blocks' tokens, so it follows [Theming](/guide/theming/) with nothing to set:

- On a [Nuxt UI](https://ui.nuxt.com) site, text, muted text, rules, and code backgrounds come from `--ui-text-highlighted`, `--ui-text-muted`, `--ui-border`, and `--ui-bg-elevated`, and a `.dark` class switches them.
- On a [shadcn/ui](https://ui.shadcn.com) site, they come from `--foreground`, `--muted-foreground`, `--border`, and `--accent`.
- With neither, they use shadcn's neutral theme and follow the system's light or dark mode.

Fonts come from Tailwind's `--font-sans` and `--font-mono`, which Nuxt UI and shadcn/ui both set. Code with a light and a dark Shiki theme switches with the page too.

## Change it

Set these variables on the element you render into, or on `:root`:

| Variable | Default | Description |
| --- | --- | --- |
| `--typeset-size` | `1em` | The text size, 1.125 times larger on narrow screens. |
| `--typeset-leading` | `1.75` | The line height. |
| `--typeset-flow` | `1.25em` | The space between paragraphs, lists, and blocks. Headings scale it. |
| `--comark-font` | `--font-sans`, then the system's sans-serif | The text's font, shared with the blocks. |
| `--comark-font-heading` | `--font-heading`, then the text's font | The headings' font. |
| `--comark-font-mono` | `--font-mono`, then the system's monospace | The font of inline code and code blocks. |
| `--comark-grain` | T3 Code's noise tile | The grain over the document's background. `none` turns it off. |
| `--comark-grain-size` | `256px 256px` | The size of one grain tile. |

The `--typeset-*` variables are shadcn/typeset's, so values you set for it carry over.

```css
.article {
  --typeset-size: 0.9375rem;
  --typeset-flow: 1em;
  --comark-font-heading: "Inter Display", var(--font-sans);
}
```

The colors are the shared [tokens](/guide/theming/#tokens): `--comark-foreground` for text and headings, `--comark-muted` for captions, markers, and quotes, `--comark-border` for rules and table lines, `--comark-accent` for code backgrounds, and `--comark-radius` for code and image corners.

### Grain

The grain is the noise tile from [T3 Code](https://github.com/pingdotgg/t3code). It's a `background-image` on the element you render into, so it covers that element's background color and scrolls with the text. Turn it off, or swap in your own tile:

```css
.article {
  --comark-grain: none;
}
```

> [!NOTE]
> If your page already paints a grain on `body` or around the document, set `--comark-grain: none` so the two don't stack.

### Your own rules

Plain rules of yours win without `!important`:

```css
.article h2 {
  letter-spacing: -0.01em;
}
```

### Keep one part as it is

Nothing inside an element with the `not-typeset` class or a `data-not-typeset` attribute gets styled. Use it for your own widget inside a document:

```html
<div class="not-typeset">
  <p>This paragraph keeps the page's own styles.</p>
</div>
```

### Width

The column's width is yours to set, since only the page knows what sits beside it. About 46rem reads well:

```css
.article {
  max-width: 46rem;
  margin-inline: auto;
}
```

### Wide blocks

A [before/after comparison](/annotate/components/compare/) and a Mermaid diagram wider than the column carry `data-wide`, so the diagram's labels don't shrink to fit. They grow into the room you give them on each side of the column, and keep to the column if you give none. For a column centered in the window:

```css
.article {
  /* The space beside the column, less 1.5rem from the window's edge. 100% is the column. */
  --comark-wide-start: calc((100vw - 100%) / 2 - 1.5rem);
  --comark-wide-end: calc((100vw - 100%) / 2 - 1.5rem);
}
```

| Variable | Default | Description |
| --- | --- | --- |
| `--comark-wide-start` | `0px` | How far a wide block may grow before the column, on the left in a left-to-right page. `100%` in it is the column's width. |
| `--comark-wide-end` | `0px` | How far it may grow after the column. Keep it clear of what sits beside the text, such as a side panel or an [outline](/outline/). |
| `--comark-wide-max` | `72rem` | The widest a wide block grows, however much room there is. |
| `--comark-wide-width` | Set by the block | A block's own width, which a diagram never grows past. Your own blocks can set it too. |

A wide block stays centered on the column. When one side has less room, such as beside a panel, it shifts toward the side with more, so a diagram keeps its size. The [side outline](/outline/#side-outline) tells the page when it needs a column beside wide blocks. Only top-level blocks grow, so a diagram inside tabs or a list keeps to its parent. To make your own block wide, put `data-wide` on its outer element.

## Turn it off

Use `typeset: false` when your site already styles Markdown, such as with Tailwind Typography's `prose` or Nuxt UI's prose components:

```ts
comarkUi({ typeset: false });
```

The blocks keep their own styles either way.

## Without the preset

comark-ui exports the plugin and its CSS on their own. Add `typeset()` to your plugins and render its `typeset-styles` node, or put `typesetCss` in a `<style>` inside the element you render into:

```ts
import { typesetCss } from "comark-ui";

const page = `<article><style>${typesetCss}</style>${html}</article>`;
```

### In your own stylesheet

Some Comark content isn't a rendered document, such as a rich-text editor whose root is an element of your app, so a `<style>` can't sit inside it. Import `comark-ui/typeset.css` with your CSS and give that element the `comark-typeset` class:

```css
@import "comark-ui/typeset.css";
```

```html
<div class="comark-typeset" contenteditable="true">…</div>
```

It holds the same rules, layer, and variables as the inline styles, scoped with `@scope (.comark-typeset)`. To scope them to a class you already use, build the stylesheet with `typesetStylesheet()`. Import it from `comark-ui/client` in a browser to keep the parse plugins out of the bundle:

```ts
import { typesetStylesheet } from "comark-ui/client";

document.head.append(Object.assign(document.createElement("style"), { textContent: typesetStylesheet(".editor") }));
```

The `comark` layer is declared where your CSS first names it. Name it before your utilities' layer, such as `@layer theme, base, comark, components, utilities;` with Tailwind, if you want utility classes to win over it.

## Next steps

- [Theming](/guide/theming/) sets the tokens the text and the blocks share.
- [Renderers](/guide/renderers/) shows how each renderer adds the blocks' styles and scripts.
