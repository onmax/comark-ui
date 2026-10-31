unavatar.io, which serves the avatars from X, Bluesky, YouTube, GitLab, and `avatar="provider:name"`, answers 25 downloads a day for each IP address without a plan. Past that it answers HTTP 429, and the chip keeps the URL for the reader's browser to load.

Nothing in the document is wrong: build again later. Downloaded images are cached for a week. A CI that starts clean downloads them on every build, so give the cache a folder you commit:

```ts
import chips from "comark-chips";

const plugins = [chips({ cache: ".comark/chips" })];
```
