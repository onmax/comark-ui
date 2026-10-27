---
title: Typeset
description: The text around the blocks, styled out of the box on the same tokens as the blocks, for Nuxt UI, shadcn/ui, or a page with neither.
keywords: prose, typography, Tailwind Typography, shadcn typeset, CSS, fonts, spacing, headings, tables, base styles, reset
tagline: Headings, paragraphs, lists, tables, code, and quotes look finished with no CSS of your own, and match the blocks beside them.
---

This page shows what comark-ui does to the text around the blocks, how it fits your site's theme, and how to change it or turn it off.

## What it styles

comark-ui styles the plain Markdown in a document as well as its blocks: headings, paragraphs, links, lists and task lists, tables, inline code and code blocks, quotes, footnotes, images, and definition lists. The rules are [shadcn/typeset](https://ui.shadcn.com/docs/typeset), on the same `--comark-*` tokens the blocks use.

- **On by default.** Every renderer from `comark-ui` writes them, so a document reads well before you write any CSS.
- **Scoped to the document.** The styles sit in a `<style>` inside the rendered document and use `@scope`, so they reach the element the document renders into and nothing else on the page.
- **In the server's HTML.** Vue, React, and Svelte render the `<style>` with the document instead of adding it on mount, so a server-rendered page arrives styled and doesn't shift.
- **With a grain.** A faint noise over the document's background, which `--comark-grain: none` turns off.
- **Under the blocks.** The rules sit in a `typeset` layer inside the `comark` layer, so every block's own rules win over them, and any plain rule of yours wins over both.

The styles need `@scope`, which every current browser supports. An older browser skips them and shows its default text styles; the blocks still render.

## Your site's theme

The text reads the same tokens as the blocks, so it follows [Theming](/guide/theming/) with nothing more to set:

- On a [Nuxt UI](https://ui.nuxt.com) site, text, muted text, rules, and code backgrounds come from `--ui-text-highlighted`, `--ui-text-muted`, `--ui-border`, and `--ui-bg-elevated`, and a `.dark` class switches them.
- On a [shadcn/ui](https://ui.shadcn.com) site, they come from `--foreground`, `--muted-foreground`, `--border`, and `--accent`.
- With neither, they use shadcn's neutral theme and follow the system's light or dark mode.

Fonts come from Tailwind's `--font-sans` and `--font-mono`, which Nuxt UI and shadcn/ui both set. Code highlighted with a light and a dark Shiki theme switches with the page too.

## Change it

Set these variables on the element you render into, or on `:root`:

| Variable | Default | Description |
| --- | --- | --- |
| `--typeset-size` | `1em` | The text size. Narrow screens read it 1.125 times larger. |
| `--typeset-leading` | `1.75` | The line height. |
| `--typeset-flow` | `1.25em` | The space between paragraphs, lists, and blocks. Headings scale it. |
| `--comark-font` | `--font-sans`, then the system's sans-serif | The text's font, shared with the blocks. |
| `--comark-font-heading` | `--font-heading`, then the text's font | The headings' font. |
| `--comark-font-mono` | `--font-mono`, then the system's monospace | The font of inline code and code blocks. |
| `--comark-grain` | T3 Code's noise tile | The grain over the document's background. `none` turns it off. |
| `--comark-grain-size` | `256px 256px` | The size of one grain tile. |

The `--typeset-*` variables are shadcn/typeset's own, so values you already set for it carry over.

```css
.article {
  --typeset-size: 0.9375rem;
  --typeset-flow: 1em;
  --comark-font-heading: "Inter Display", var(--font-sans);
}
```

The colors are the shared [tokens](/guide/theming/#tokens): `--comark-foreground` for text and headings, `--comark-muted` for captions, markers, and quotes, `--comark-border` for rules and table lines, `--comark-accent` for code backgrounds, and `--comark-radius` for code and image corners.

### Grain

The document gets a faint grain over its background, the noise from [T3 Code](https://github.com/pingdotgg/t3code), so it doesn't read as a flat sheet. It's a `background-image` on the element you render into, so it sits over the background color you give that element, and it scrolls with the text rather than sitting in a fixed overlay. Turn it off, or swap in your own tile:

```css
.article {
  --comark-grain: none;
}
```

> [!NOTE]
> If your page already paints a grain on `body` or around the document, set `--comark-grain: none`, or the two layers of noise add up.

### Your own rules

Any plain rule of yours wins without `!important`, since the styles sit in a layer:

```css
.article h2 {
  letter-spacing: -0.01em;
}
```

### Keep one part as it is

Add the `not-typeset` class, or a `data-not-typeset` attribute, to an element, and nothing inside it is styled. Use it for a widget of your own that you render inside a document:

```html
<div class="not-typeset">
  <p>This paragraph keeps the page's own styles.</p>
</div>
```

### Width

The styles leave the column's width to you, since only the page knows what sits beside it. A readable line is about 46rem; set it on the element you render into:

```css
.article {
  max-width: 46rem;
  margin-inline: auto;
}
```

### Wide blocks

Some blocks read better wider than a line of text: a [before/after comparison](/annotate/components/compare/) and a Mermaid diagram wider than the column, whose labels would otherwise shrink to fit. They carry a `data-wide` attribute, and they grow into the room you give them, centered on the column. Without a room set, they keep to the column. Set it where you render:

```css
.article {
  /* Up to the viewport, less 1.5rem on each side. */
  --comark-wide-room: calc(100vw - 3rem);
}
```

| Variable | Default | Description |
| --- | --- | --- |
| `--comark-wide-room` | `100%`, the column | How wide a wide block may grow. `100%` in it is the column's width, so `calc(100% + 16rem)` gives 8rem on each side. |
| `--comark-wide-max` | `72rem` | The widest a wide block grows, however much room there is. |
| `--comark-wide-width` | Set by the block | A block's own width: a diagram never grows past it. A block of your own can set it too. |

A block that sits beside something on the page, such as a sidebar or an outline, needs a room that keeps clear of it. The [side outline](/outline/#side-outline) tells the page when it needs a column beside wide blocks. Only a document's top-level blocks grow; a diagram inside tabs or a list keeps to its parent. Mark a block of your own as wide with `data-wide` on its outer element.

## Turn it off

Use `typeset: false` when your site already styles Markdown, such as with Tailwind Typography's `prose` or Nuxt UI's prose components:

```ts
comarkUi({ typeset: false });
```

The blocks keep their own styles either way.

## Without the preset

The plugin and its CSS are exported on their own. Add `typeset()` to your plugins and render its `typeset-styles` node, or put `typesetCss` in a `<style>` inside the element you render into. In a browser, such as around a rich-text editor, import `typesetCss` from `comark-ui/client`, which leaves the parse plugins out of the bundle:

```ts
import { typesetCss } from "comark-ui";

const page = `<article><style>${typesetCss}</style>${html}</article>`;
```

## Next steps

- [Theming](/guide/theming/) sets the tokens the text and the blocks share.
- [Renderers](/guide/renderers/) covers how each renderer adds the blocks' styles and scripts.
