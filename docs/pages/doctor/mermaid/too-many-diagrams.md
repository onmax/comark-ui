Your site's `mermaid.maxDiagrams` option limits how many Mermaid diagrams a document draws. A diagram past that count shows its source as a code block with Copy instead. Move the extra diagrams to another document or remove ones you no longer need.

The limit is a preset option, not part of the Markdown. If you own the site, choose the count when you register the preset and pass its plugins to the linter too:

```ts
import comarkUi from "comark-ui/html";
import { lint } from "comark-linter";

const preset = comarkUi({ mermaid: { maxDiagrams: 4 } });
const issues = await lint(markdown, preset);
```

With this setting, the first four diagrams draw and later diagrams show their source. With no `maxDiagrams` option, the preset does not limit the count.
