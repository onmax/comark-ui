---
title: QR
description: QR codes drawn while parsing, written in Markdown.
keywords: QR code, qrcode, barcode, phone, mobile preview, scan
tagline: Put a QR code next to a preview link so a reviewer can open it on their phone. It's an SVG drawn while parsing, with no script and no image to fetch.
group: Review blocks
icon: qr-code
blurb: QR codes for preview links
credits: 'Encoded with <a href="https://antfu.me">Anthony Fu</a>''s <a href="https://github.com/unjs/uqr">uqr</a>, at the defaults of his <a href="https://qrcode.antfu.me">QR Toolkit</a>.'
---

::examples
:::example{label="Preview link"}
```md
Open [comark-ui.onmax.me/qr](https://comark-ui.onmax.me/qr/), or scan it on your phone:

:qr{value="https://comark-ui.onmax.me/qr/"}
```
:::
::

The code is an inline SVG with one path, dark on white in both color schemes, so a phone's camera reads it off any page, and it prints.

## Usage

```md
:qr{value="https://pr-123.preview.example.com"}
```

| Prop | What it does |
| --- | --- |
| `value` | Required. The text to encode, usually a link. Up to about 2,300 characters. |

`:qr` is inline, so it can sit in a sentence, a table cell, or a list item. Screen readers announce it as "QR code:" followed by its value. The code uses error correction level M and a quiet zone of two modules.

The plugin adds every problem to `meta.issues`, as [Validation](/guide/validation/) describes: a `:qr` with no `value`, one too long to encode, text in its brackets, and a prop it doesn't read. Each issue names its block and says how to fix it, and each has its own rule in [Doctor](/doctor/). A `:qr` with no `value`, or one too long, renders nothing.

## Examples

### Preview links in review documents

A review of a visual change often comes with a preview deployment. Put its link and a code side by side, so a reviewer at a desk clicks and one with a phone scans:

```md
| Preview | Phone |
| --- | --- |
| [pr-123.preview.example.com](https://pr-123.preview.example.com) | :qr{value="https://pr-123.preview.example.com"} |
```

### Sizing

Codes are 8rem wide by default. Set `--cqr-size` on `.cqr` or any element above it:

```css
.cqr {
  --cqr-size: 6rem;
}
```

### Border

The code has no border, since its white tile and quiet zone already set it apart, and on a white page it needs nothing. To outline it, give the `svg` a border:

```css
.cqr svg {
  border: 1px solid var(--comark-border, #e5e5e5);
}
```

## API

The plugin takes no options. `qr: false` in `comarkUi()` turns it off.

The parse plugin encodes the code with [uqr](https://github.com/unjs/uqr), Anthony Fu's zero-dependency ES module of 27 kB (8 kB gzipped) from his [QR Toolkit](https://qrcode.antfu.me), at its defaults, and writes its modules as an SVG path, so no renderer encodes anything.

### Package

comark-ui brings `comark-qr` and registers it. To use it alone, install it with Comark and a renderer:

```sh
pnpm add comark @comark/html comark-qr
```

Register the plugin and pass the renderer's `components`:

```ts
import { createHtmlRenderer } from "@comark/html";
import qr, { components } from "comark-qr/html";

const render = createHtmlRenderer({ plugins: [qr()], components });
```

For Vue, React, or Svelte, import from `comark-qr/vue`, `comark-qr/react`, or `comark-qr/svelte`; the components add the styles when they mount. Import `comark-qr/style.css` with your styles so a server-rendered page doesn't shift. [Renderers](/guide/renderers/) covers using it with other plugins.

## Theme

The code sits on a white tile that reads `--comark-radius`, one of the [shared tokens](/guide/theming/), for its corners, capped at `0.5rem` so they can't round into the code. The modules are always black on white, in both color schemes, since phones read dark modules on a light ground best. The rules sit in a `comark` CSS layer, so any plain rule of your own wins.

| Class | Element |
| --- | --- |
| `.cqr` | The `span` around the code's `svg` |
