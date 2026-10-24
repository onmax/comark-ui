The `base` option is the document's folder relative to `root`, where a relative `src` starts. One that climbs out of the root, such as `../posts`, is ignored, and every relative `src` starts at the root instead.

```ts
import table from "comark-table";

// For content/posts/deploy.md, with root at content/
table({ root: "content", base: "posts" });
```
