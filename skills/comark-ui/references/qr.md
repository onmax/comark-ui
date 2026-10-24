# QR codes

comark-qr draws `:qr` as a QR code, an inline SVG encoded while parsing, with no script and no image to fetch. Put one beside a preview link, so a reviewer at a desk clicks and one with a phone scans.

## Syntax

```md
| Preview | Phone |
| --- | --- |
| [pr-123.preview.example.com](https://pr-123.preview.example.com) | :qr{value="https://pr-123.preview.example.com"} |
```

`value` is the one prop, and it's required: the text to encode, usually a link, up to about 2,300 characters. `:value="frontmatter.preview"` takes it from the frontmatter. `:qr` is inline, so it sits in a sentence, a table cell, or a list item. Write a caption outside it, since the plugin drops text in its brackets. A `:qr` with no `value`, or one too long to encode, renders nothing and is reported.

The code is black on white in both color schemes and 8rem wide, with error correction level M and a two-module quiet zone. Screen readers announce it as "QR code:" followed by its value. Encode the same link the text beside it shows, so both open one page.

## Register

- In `comark-ui`: on. It takes no options.
- Alone: `pnpm add comark @comark/html comark-qr`, then `createHtmlRenderer({ plugins: [qr()], components })` with both from `comark-qr/html`. `comark-qr/vue`, `/react`, and `/svelte` render it too. It has no options and no script; `--cqr-size` on `.cqr` sets the width.
