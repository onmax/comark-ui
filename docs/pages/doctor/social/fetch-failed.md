With the `fetch` option, comark-social asks the platform's public API for each post with a `url` on X, Bluesky, or Mastodon, and downloads its avatar and pictures. This issue means one of those requests failed: the post was deleted or isn't public, the address names no post, the server didn't answer, or a picture's address answered with an error. The card shows what's written, and a picture that couldn't be downloaded loads from its address.

comark-social only finds this while it fetches, so it isn't reported without the option:

```ts
import social from "comark-social";

// Fills each post from its platform while parsing, so a post that can't be fetched is reported.
const plugins = [social({ fetch: true })];
```

Check the post's address in a private window. If it's gone, write the post's props and text by hand.
