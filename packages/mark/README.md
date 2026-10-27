# comark-mark

[![npm version](https://comark-ui.onmax.me/badge.svg?source=npm-version&package=comark-mark&icon=npm)](https://npmx.dev/package/comark-mark)
[![npm downloads](https://comark-ui.onmax.me/badge.svg?source=npm-downloads&package=comark-mark&period=month&icon=npm)](https://npmx.dev/package/comark-mark)
[![license](https://comark-ui.onmax.me/badge.svg?label=license&value=MIT)](https://npmx.dev/package/comark-mark)
[![docs](https://comark-ui.onmax.me/badge.svg?label=docs&value=comark-ui.onmax.me)](https://comark-ui.onmax.me/mark/)

Highlights and superscripts in [Comark](https://comark.dev): `==text==` as `<mark>` and `^text^` as `<sup>`. A plugin for HTML, Vue, React, and Svelte.

```sh
pnpm add comark comark-mark
```

```ts
import { createHtmlRenderer } from "@comark/html";
import mark, { components } from "comark-mark/html";

const render = createHtmlRenderer({ plugins: [mark()], components });
```

```md
The deploy waits while ==more than 12 pigeons== sit on the roof.

==Do not deploy=={.warning} before 10^3^ ducks are counted.
```

Markdown works inside a highlight and `{attributes}` work after one. A superscript holds no spaces unless they're escaped, and `[^1]` is never read as one, so footnotes keep working.

There is no `~sub~`: Comark's autoClose escapes a lone `~` ([comarkdown/comark#462](https://github.com/comarkdown/comark/issues/462)), and GitHub reads `~text~` as strikethrough. Write `<sub>2</sub>` instead.

It works with `registerDefaultPlugins: false` and in streaming parses.

## Renderers

| Renderer | Import |
| --- | --- |
| `@comark/html` | `comark-mark/html`: the styles are inlined once per document |
| `@comark/vue` | `comark-mark/vue` |
| `@comark/react` | `comark-mark/react` |
| `@comark/svelte` | `comark-mark/svelte` |

Each entry exports the parse plugin as `default` and the renderer's `components`. The components tint a highlight amber over the page's own text color and keep a superscript from opening a gap in its line. The Vue, React, and Svelte components add the styles when they mount; import `comark-mark/style.css` with your styles so a server-rendered page doesn't shift. Set `--cmk-mark` to change the highlight's color; the rules sit in a `comark` CSS layer, so any plain rule of your own wins. Without the components, the plugin works in any renderer and its nodes stay plain `mark` and `sup`.

## Credits

Ported from [markdown-it-mark](https://github.com/markdown-it/markdown-it-mark) and [markdown-it-sup](https://github.com/markdown-it/markdown-it-sup) by Vitaly Puzrin and Alex Kocharin, MIT.
