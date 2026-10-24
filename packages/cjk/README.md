# comark-cjk

[![npm version](https://npmx.dev/api/registry/badge/version/comark-cjk)](https://npmx.dev/package/comark-cjk)
[![npm downloads](https://npmx.dev/api/registry/badge/downloads-month/comark-cjk)](https://npmx.dev/package/comark-cjk)
[![install size](https://npmx.dev/api/registry/badge/size/comark-cjk)](https://npmx.dev/package/comark-cjk)
[![license](https://npmx.dev/api/registry/badge/license/comark-cjk)](https://npmx.dev/package/comark-cjk)
[![docs](https://img.shields.io/badge/docs-comark--ui.onmax.me-14b8a6?labelColor=0a0a0a)](https://comark-ui.onmax.me/cjk/)

Bold, italics, and strikethrough that work next to Chinese, Japanese, and Korean punctuation in [Comark](https://comark.dev). A parse plugin with no components and no styles, so it works in any renderer.

```sh
pnpm add comark comark-cjk
```

```ts
import { parseMarkdown } from "comark";
import cjk from "comark-cjk";

const document = await parseMarkdown(markdown, {
  plugins: [cjk()],
});
```

```md
**この文は太字。**次の文
**这句话是粗体。**下一句
**이 문장은 굵게.**다음 문장
```

CommonMark leaves the asterisks on all three lines. A closing `**` between punctuation and a letter doesn't count as closing, and these languages put no space after `。` or `.`. The plugin relaxes that rule next to Chinese, Japanese, and Korean characters only, so other text parses as before. `_` still doesn't open or close inside a word, so write `**` and `*`.

It takes no options, and works with `registerDefaultPlugins: false` and in streaming parses.

## Credits

The plugin runs [markdown-it-cjk-friendly](https://github.com/tats-u/markdown-cjk-friendly) by tats-u, MIT, unchanged.
