# Emphasis in Chinese, Japanese, and Korean

comark-cjk lets `**`, `*`, and `~~` open and close next to Chinese, Japanese, and Korean punctuation. These languages put no space after `。`, `」`, or `.`, so CommonMark leaves the asterisks on the page when a `**` sits between that punctuation and the next word. A document in one of these languages needs it.

## What changes

```md
**この文は太字。**次の文は普通です。

会議は*「金曜日」*に移りました。

**이 문장은 굵게.**다음 문장은 아닙니다.
```

The syntax stays CommonMark's. Only the rule for where a delimiter opens and closes changes, and only next to a Chinese, Japanese, or Korean character. Other text parses as before, so `**foo.**bar` still shows its asterisks.

- Write `**` and `*`. `_` and `__` still don't open or close inside a word.
- GitHub follows CommonMark here. For text that has to read the same on GitHub, close the bold before the punctuation: `**太字**。`.

## Register

- In `comark-ui`: on by default. `cjk: false` turns it off; it takes no options.
- Alone: `pnpm add comark comark-cjk`, then `plugins: [cjk()]` with `import cjk from "comark-cjk"`. It has no components and no styles, so it works in any renderer and in streaming parses.
