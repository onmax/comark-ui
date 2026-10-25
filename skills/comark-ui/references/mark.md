# Highlights and superscripts

comark-mark renders `==text==` as a native `<mark>` and `^text^` as `<sup>`. Use a highlight for the few words a reader should see first, such as the number that changed or the condition a fix adds, and a superscript for exponents and ordinals.

## Syntax

```md
The deploy waits while ==more than 12 pigeons== sit on the roof, about 10^3^ by Friday.

==Do not deploy=={.warning} before the 1^st^ count of the day.
```

- `==text==` highlights. Markdown works inside, and `{attributes}` work after the closing pair, so `==Do not deploy=={.warning}` renders `<mark class="cmk-mark warning">`. A single `=`, as in `a = b`, stays text, and so does a `==` with nothing to close it.
- `^text^` is a superscript of plain text with no spaces; escape a space with a backslash, `^spaced\ text^`. `[^1]` never opens one, so footnotes keep working.
- There is no subscript, since GitHub reads `~text~` as strikethrough. Write `H<sub>2</sub>O`.

Highlight a few words per paragraph at most. When you highlight a whole paragraph, nothing in it stands out. For a reviewer's highlight with a comment, use comark-critic's `{==text==}{>>comment<<}` instead.

## Register

- In `comark-ui`: on by default, with its components. `mark: false` turns it off; it takes no options.
- Alone: `pnpm add comark comark-mark`, then `plugins: [mark()]` and `components` from `comark-mark/html`, `/vue`, `/react`, or `/svelte`. The components tint a highlight amber, readable on light and dark pages, and keep a superscript from opening a gap in its line. Set `--cmk-mark` to recolor it, on the page or on a class from `{.attributes}`. Without the components, every renderer draws plain `mark` and `sup`, which browsers paint yellow. It works beside any footnotes plugin and in streaming parses.
