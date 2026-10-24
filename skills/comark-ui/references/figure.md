# Image captions

comark-figure turns an image with a title, alone in its paragraph, into a native `<figure>` with the title as its `<figcaption>`. Use it when an image needs a sentence under it that says why it's there.

## Syntax

```md
![Bar chart of deploys per day, highest on Tuesday](deploys.png "Most deploys land on Tuesday, after the Monday freeze")
```

- The caption is the title, the quoted text after the URL. It is plain text, so Markdown in it shows as written.
- The alt text stays on the image for screen readers, who hear both. Make them say different things. The alt text says what the image shows, and the caption says why it's there.
- The image keeps its `src`, its alt text, and any `{attributes}`, and loses its `title`.
- Give the image a paragraph of its own, with a blank line before and after it. That works at the top level, in a list item, a blockquote, or a definition, and in a `::component` beside another block. An image inside a sentence keeps its title as a tooltip.
- When a `::component` holds nothing but the image, the plugin leaves the image as it is. Add another block to the component, or move the image out of it.
- A linked image becomes a figure too: `[![alt](src "Caption")](https://example.com)` keeps the link around the image, with the caption under it, outside the link. A title on the link, `[![alt](src)](url "Title")`, stays the link's tooltip.

## Numbered figures

For a figure the text refers to by number, give the image comark-xref's `{#fig-…}` id and no title, and xref captions it with "Figure 1:" and its alt text. `comark-ui` runs both plugins, and there an image with both a title and a `fig-` id becomes an unnumbered figure. xref then reports it as sharing its paragraph with text, and every `:ref` to it as pointing at nothing.

## Register

- In `comark-ui`: on by default. `figure: { unwrap: true }` also lifts every image alone in its paragraph out of the `<p>`, with a title or without, so the page's CSS can size those images apart from the ones inside a sentence. Comark's `autoUnwrap` does that only in list items and blockquotes.
- Alone: `pnpm add comark comark-figure`, then `plugins: [figure()]` with `import figure from "comark-figure"`, and the same `unwrap` option. It has no components, classes, or styles, so it works in any renderer. With comark-zoom, the image in a figure still zooms, in either plugin order. Browsers indent a figure by 40px on each side until the page's CSS sets its margin.
