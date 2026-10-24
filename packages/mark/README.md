# comark-mark

[![npm version](https://npmx.dev/api/registry/badge/version/comark-mark)](https://npmx.dev/package/comark-mark)
[![npm downloads](https://npmx.dev/api/registry/badge/downloads-month/comark-mark)](https://npmx.dev/package/comark-mark)
[![install size](https://npmx.dev/api/registry/badge/size/comark-mark)](https://npmx.dev/package/comark-mark)
[![license](https://npmx.dev/api/registry/badge/license/comark-mark)](https://npmx.dev/package/comark-mark)
[![docs](https://img.shields.io/badge/docs-comark--ui.onmax.me-14b8a6?labelColor=0a0a0a)](https://comark-ui.onmax.me/mark/)

Highlights and superscripts in [Comark](https://comark.dev): `==text==` as `<mark>` and `^text^` as `<sup>`. A parse plugin with no components and no styles, so it works in any renderer.

```sh
pnpm add comark comark-mark
```

```ts
import { parseMarkdown } from "comark";
import mark from "comark-mark";

const document = await parseMarkdown(markdown, {
  plugins: [mark()],
});
```

```md
The deploy waits while ==more than 12 pigeons== sit on the roof.

==Do not deploy=={.warning} before 10^3^ ducks are counted.
```

Markdown works inside a highlight and `{attributes}` work after one. A superscript holds no spaces unless they're escaped, and `[^1]` is never read as one, so footnotes keep working.

There is no `~sub~`: Comark's autoClose escapes a lone `~` ([comarkdown/comark#462](https://github.com/comarkdown/comark/issues/462)), and GitHub reads `~text~` as strikethrough. Write `<sub>2</sub>` instead.

It works with `registerDefaultPlugins: false` and in streaming parses.

## Credits

Ported from [markdown-it-mark](https://github.com/markdown-it/markdown-it-mark) and [markdown-it-sup](https://github.com/markdown-it/markdown-it-sup) by Vitaly Puzrin and Alex Kocharin, MIT.
