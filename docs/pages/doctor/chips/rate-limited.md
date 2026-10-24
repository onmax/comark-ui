unavatar.io, which serves the avatars from X, Bluesky, YouTube, GitLab, and `avatar="provider:name"`, answers 25 downloads a day for each IP address without a plan. Past that it answers HTTP 429, and the chip keeps the URL for the reader's browser to load.

Nothing in the document is wrong: build again later. Each image is cached for a week once downloaded. A CI that starts with no `node_modules` downloads everything on every build, so give the cache a folder you commit:

```ts
import chips from "comark-chips";

const plugins = [chips({ cache: ".comark/chips" })];
```
