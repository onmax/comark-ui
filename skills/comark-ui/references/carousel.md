# Carousels

comark-carousel turns the blocks inside `::carousel` into slides that scroll and snap, with arrows, a counter, arrow keys, and zoom. Use it for a sequence the reader pages through in one place, such as the screens of a flow or one page at several widths.

## Syntax

```md
::carousel{title="Checkout at three widths"}
![Checkout at 1440 px, with the summary beside the form](checkout-1440.png)

![Checkout at 768 px, with the summary under the form](checkout-768.png)

![Checkout at 375 px, with the summary folded into a bar](checkout-375.png)
::
```

- `::carousel`: every block inside is one slide, unless it holds `:::slide` blocks. `title` names the carousel for screen readers, default `Carousel`, and heads the zoomed view of a slide that has no title or image of its own. `columns` is `1` (default), `2`, or `3`, the slides a wide page shows at once; a narrow page shows one. `zoom=false` turns zoom off.
- `:::slide`: one slide that holds several blocks. Its `title` heads the slide's zoomed view and doesn't show on the page. Once a carousel has a `:::slide`, the blocks outside every `:::slide` are dropped and reported.
- A click zooms a slide, with the others in a strip below it. An image slide takes the image's alt text as its heading there.
- Props can be bound, such as `:columns="2"`. A bound `zoom` or `title` reads only the document and its frontmatter, since each slide takes them while parsing.

## Choose the slides

- A paragraph after an image becomes a slide of its own. Wrap an image and its text in a `:::slide` to keep them together, and write a heading inside it when the page should show the slide's name.
- Each `:::screenshot` from comark-annotate is one slide with its marks and notes, and its `title` names the step. Use that for a walkthrough of annotated screens.
- For one view before and after a change, write annotate's `::compare` instead. It is a two-column carousel already, titles the pair Before and After, and takes marks.

## Register

- In `comark-ui`: on, as `carousel`, with no options.
- Alone: `pnpm add comark @comark/html comark-carousel`, then `createHtmlRenderer({ plugins: [carousel()], components })` with both from `comark-carousel/html`. `comark-carousel/vue`, `/react`, and `/svelte` export the same pair for those renderers. comark-zoom installs with it, so slides zoom without `zoom()`. A page rendered on a server with Vue, React, or Svelte needs zoom's styles too: add `comark-zoom` and import `comark-zoom/style.css` beside `comark-carousel/style.css`.
