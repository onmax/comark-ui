comark-code-notes takes the markers out of the code before Shiki highlights it, and draws them into the lines Shiki writes. When `shiki` comes after it in `plugins`, Shiki skips the code whose markers are already drawn, so the annotated code stays plain.

The order of the plugins is an option, not part of the document:

```ts
import shiki from "comark/plugins/shiki";
import codeNotes from "comark-code-notes";

// Not [codeNotes(), shiki()].
const plugins = [shiki(), codeNotes()];
```
