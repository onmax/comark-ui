Your site's `shiki.maxBlocks` option limits how many code blocks a document highlights. A block past that count shows its code without colors, still with Copy. Move the extra code to another document or remove blocks you no longer need.

The limit is a preset option, not part of the Markdown. If you own the site, choose the count when you register the preset and pass its plugins to the linter too:

```ts
import comarkUi from "comark-ui/html";
import { lint } from "comark-linter";

const preset = comarkUi({ shiki: { highlighter, themes, maxBlocks: 50 } });
const issues = await lint(markdown, preset);
```

With this setting, the first 50 blocks your highlighter knows the language of get colors and later ones show plain. With no `maxBlocks` option, the preset does not limit the count.
