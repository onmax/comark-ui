Your site's `mermaid.maxSource` option limits the total characters of Mermaid source a document draws, across all its diagrams. A diagram that would exceed the remaining budget shows its source as a code block with Copy instead. Shorten it or move it to another document.

The limit is a preset option, not part of the Markdown. If you own the site, choose the budget when you register the preset and pass its plugins to the linter too:

```ts
import comarkUi from "comark-ui/html";
import { lint } from "comark-linter";

const preset = comarkUi({ mermaid: { maxSource: 8000 } });
const issues = await lint(markdown, preset);
```

Only diagrams that draw use the budget, so a later, shorter diagram can still fit after one shows its source. With no `maxSource` option, the preset does not limit the source length.
