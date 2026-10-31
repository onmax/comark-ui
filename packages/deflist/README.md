# comark-deflist

[![npm version](https://comark-ui.onmax.me/badge.svg?source=npm-version&package=comark-deflist&icon=npm)](https://npmx.dev/package/comark-deflist)
[![npm downloads](https://comark-ui.onmax.me/badge.svg?source=npm-downloads&package=comark-deflist&period=month&icon=npm)](https://npmx.dev/package/comark-deflist)
[![license](https://comark-ui.onmax.me/badge.svg?label=license&value=MIT)](https://npmx.dev/package/comark-deflist)
[![docs](https://comark-ui.onmax.me/badge.svg?label=docs&value=comark-ui.onmax.me)](https://comark-ui.onmax.me/deflist/)

Definition lists in [Comark](https://comark.dev): a term, then `: definition` lines, rendered as native `<dl>`, `<dt>`, and `<dd>`. A parse plugin with no components and no styles, so it works in any renderer.

```sh
pnpm add comark comark-deflist
```

```ts
import { parseMarkdown } from "comark";
import deflist from "comark-deflist";

const document = await parseMarkdown(markdown, {
  plugins: [deflist()],
});
```

```md
Flaky test
: A test that passes and fails on the same code.

Rubber duck
: A listener who doesn't need to understand the bug.
~ A bath toy.

Pigeon count
:   The number of pigeons on the office roof at 9:00.

    Above 12, the deploy waits.
```

A term is one line, and each definition starts with `:` or `~` and a space. Lines indented past the marker continue the definition, so it can hold paragraphs, lists, and code.

## Credits

Ported from [markdown-it-deflist](https://github.com/markdown-it/markdown-it-deflist) by Vitaly Puzrin and Alex Kocharin, MIT.
