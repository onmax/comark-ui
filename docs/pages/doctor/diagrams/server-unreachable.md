The plugin draws diagrams while the document is parsed, by sending each fence to a Kroki server. When the server can't be reached, because the build is offline, the server is down, or `server` is wrong, the fence stays as code. The message gives the server and the reason.

Nothing in the document is wrong. Check `server`, or build again. A failed drawing isn't kept, so the next parse tries again. To keep diagram sources private, or to draw them without the public server, run your own Kroki and point the plugin at it:

```ts
import diagrams from "comark-diagrams";

const plugins = [diagrams({ server: "https://kroki.internal" })];
```

It has no example to lint here, since it depends on the network and not on the Markdown.
