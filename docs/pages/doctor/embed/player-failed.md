Your `player` option threw on a link, so the block falls back to the built-in providers, or to a card, and the message repeats the error. Return nothing for a link the function can't read.

```ts
import embed from "comark-embed";

embed({
  player(url) {
    if (url.hostname !== "clips.example.com") return;
    // `decodeURIComponent` throws on `/%`, which reports player-failed; read the ID with a pattern instead.
    const id = /^\/c\/(\w+)$/.exec(url.pathname)?.[1];
    if (!id) return;
    return { provider: "clips", src: `https://clips.example.com/embed/${id}`, label: "Clip", size: "app" };
  },
});
```
