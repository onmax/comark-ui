# comark-critic

[![npm version](https://comark-ui.onmax.me/badge.svg?source=npm-version&package=comark-critic&icon=npm)](https://npmx.dev/package/comark-critic)
[![npm downloads](https://comark-ui.onmax.me/badge.svg?source=npm-downloads&package=comark-critic&period=month&icon=npm)](https://npmx.dev/package/comark-critic)
[![license](https://comark-ui.onmax.me/badge.svg?label=license&value=MIT)](https://npmx.dev/package/comark-critic)
[![docs](https://comark-ui.onmax.me/badge.svg?label=docs&value=comark-ui.onmax.me)](https://comark-ui.onmax.me/critic/)

[CriticMarkup](https://criticmarkup.com) in [Comark](https://comark.dev): suggested insertions, deletions, substitutions, highlights, and comments, rendered as native `<ins>`, `<del>`, and `<mark>` with a class each, or accepted or rejected. A parse plugin with no components, so it works in any renderer.

```sh
pnpm add comark comark-critic
```

```ts
import { parseMarkdown } from "comark";
import critic from "comark-critic";
import "comark-critic/style.css";

const document = await parseMarkdown(markdown, {
  plugins: [critic({ mode: "view" })],
});
```

```md
The deploy waits when more than {--twelve--}{++fifteen++} pigeons sit on the roof.

Count them {~~after~>before~~} the stand-up, from the {==east window==}{>>Not the west one.<<}.
```

| Mark | Markdown | `view` | `accept` | `reject` |
| --- | --- | --- | --- | --- |
| Insertion | `{++added++}` | `<ins class="ccm-ins">` | its text | nothing |
| Deletion | `{--removed--}` | `<del class="ccm-del">` | nothing | its text |
| Substitution | `{~~old~>new~~}` | `<del>` then `<ins>` | the new text | the old text |
| Highlight | `{==this==}` | `<mark class="ccm-mark">` | its text | its text |
| Comment | `{>>why<<}` | `<span class="ccm-comment">` | nothing | nothing |

Text inside a mark is Markdown, and each mark opens and closes in one paragraph. One left open stays as written and adds a sentence to `meta.issues`.

Without the plugin, Comark reads `{++added++}` as attributes and drops the whole mark. Comark's `{.class}`, `{#id}`, and `{{ bindings }}` still work.

## Styles

The marks' styles are in `comark-critic/style.css`, also exported as `css`: insertions tinted green, deletions struck through in red, highlights amber, and comments as muted chips. Each mark has a class (`ccm-ins`, `ccm-del`, `ccm-mark`, `ccm-comment`), so they never restyle a `~~strikethrough~~`. They read the [shared tokens](https://comark-ui.onmax.me/guide/#theme), so a shadcn/ui theme restyles them, and sit in the `comark` layer so your own rules win.

## Credits

Syntax from [CriticMarkup](https://criticmarkup.com), and the modes from [pymdownx.critic](https://facelessuser.github.io/pymdown-extensions/extensions/critic/).
