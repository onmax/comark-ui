Shiki draws every block it highlights again from its text, so anything comark-code wrote on the lines before it is lost. When comark-code comes first in `plugins`, a block keeps its title, frame, and Wrap, but loses its line markers, numbers, and collapsed ranges. List Shiki's plugin first:

```ts
import shiki from "@comark/html/plugins/shiki";
import code from "comark-code/html";

const plugins = [shiki(), code()];
```

It has no example here, since the order of `plugins` isn't in the Markdown.
