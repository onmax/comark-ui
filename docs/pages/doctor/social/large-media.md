With the `fetch` option, comark-social inlines a post's pictures as data URIs, so the page asks the platform for nothing. A picture larger than `maxImageSize` (500 KB by default) isn't inlined: the page loads it from the platform, which may remove it later.

comark-social only finds this while it fetches, so it isn't reported without the option:

```ts
import social from "comark-social";

// Inlines pictures up to 1 MB.
const plugins = [social({ fetch: true, maxImageSize: 1_000_000 })];
```

Raise `maxImageSize`, or save the picture with the document and write it in the post's body as `![Alt](./picture.webp)`.
