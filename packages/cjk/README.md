# comark-cjk

[![npm version](https://comark-ui.onmax.me/badge.svg?source=npm-version&package=comark-cjk&icon=npm)](https://npmx.dev/package/comark-cjk)
[![npm downloads](https://comark-ui.onmax.me/badge.svg?source=npm-downloads&package=comark-cjk&period=month&icon=npm)](https://npmx.dev/package/comark-cjk)
[![license](https://comark-ui.onmax.me/badge.svg?label=license&value=MIT)](https://npmx.dev/package/comark-cjk)
[![docs](https://comark-ui.onmax.me/badge.svg?label=docs&value=comark-ui.onmax.me)](https://comark-ui.onmax.me/cjk/)

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

CommonMark leaves the asterisks on all three lines, because a closing `**` between punctuation and a letter doesn't count as closing, and these languages put no space after `。` or `.`. The plugin relaxes that rule next to Chinese, Japanese, and Korean characters only. Other text parses as before. `_` still doesn't open or close inside a word, so write `**` and `*`.

It takes no options.

## Credits

The plugin runs [markdown-it-cjk-friendly](https://github.com/tats-u/markdown-cjk-friendly) by tats-u, MIT, unchanged.
