Your site's `shiki.maxSource` option limits the total characters of code a document highlights, across all its blocks. A block that would exceed the remaining budget shows its code without colors, still with Copy. Shorten it or move it to another document.

The limit is a preset option, not part of the Markdown. If you own the site, choose the budget when you register the preset and pass its plugins to the linter too:

```ts
import comarkUi from "comark-ui/html";
import { lint } from "comark-linter";

const preset = comarkUi({ shiki: { highlighter, themes, maxSource: 200000 } });
const issues = await lint(markdown, preset);
```

Only blocks that get colors use the budget, so a later, shorter block can still fit after one shows plain. With no `maxSource` option, the preset does not limit the code's length.
