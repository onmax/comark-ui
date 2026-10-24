# comark-figure

[![npm version](https://npmx.dev/api/registry/badge/version/comark-figure)](https://npmx.dev/package/comark-figure)
[![npm downloads](https://npmx.dev/api/registry/badge/downloads-month/comark-figure)](https://npmx.dev/package/comark-figure)
[![install size](https://npmx.dev/api/registry/badge/size/comark-figure)](https://npmx.dev/package/comark-figure)
[![license](https://npmx.dev/api/registry/badge/license/comark-figure)](https://npmx.dev/package/comark-figure)
[![docs](https://img.shields.io/badge/docs-comark--ui.onmax.me-14b8a6?labelColor=0a0a0a)](https://comark-ui.onmax.me/figure/)

Image captions in [Comark](https://comark.dev): an image alone in its paragraph with a title, `![alt](src "Caption")`, becomes a native `<figure>` with the title as its `<figcaption>`. A parse plugin with no components and no styles, so it works in any renderer.

```sh
pnpm add comark comark-figure
```

```ts
import { parseMarkdown } from "comark";
import figure from "comark-figure";

const document = await parseMarkdown(markdown, {
  plugins: [figure()],
});
```

```md
![A rubber duck on a keyboard](/duck.png "The duck that found the race condition")
```

```html
<figure>
  <img src="/duck.png" alt="A rubber duck on a keyboard">
  <figcaption>The duck that found the race condition</figcaption>
</figure>
```

The caption comes from the title only, so the alt text stays on the image for screen readers. The image keeps its other attributes and loses its `title`. An image inside a sentence, or with no title, stays as it was. A linked image counts, and the link stays around the image.

Images in list items, blockquotes, and definitions become figures too. When a `::component` holds nothing but the image, Comark's tree can't be told apart from an inline component's, so that image is left alone.

With [comark-zoom](https://comark-ui.onmax.me/zoom/), the image inside a figure still zooms, in either plugin order.

## Options

| Option | |
| --- | --- |
| `unwrap` | Lift every image that stands alone in its paragraph out of the `<p>`, with a title or without. Comark's `autoUnwrap` only does that in list items and blockquotes. Default `false`. |
