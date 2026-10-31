---
title: Keys
description: Keyboard shortcuts in Markdown, rendered as kbd keys.
keywords: keyboard, keyboard shortcut, kbd, hotkey, key combination, shortcut, keystroke, Mac keys
tagline: Keyboard shortcuts with each key in its own kbd, named the way people read them.
group: Markdown syntax
icon: keyboard
blurb: Keyboard shortcuts as kbd keys
credits: 'Syntax, key names, and aliases from <a href="https://facelessuser.github.io/pymdown-extensions/extensions/keys/">pymdownx.keys</a> by Isaac Muse.'
---

::examples
:::example{label="Shortcuts"}
```md
Press ++ctrl+shift+k++ to open the pigeon counter, and ++esc++ to close it.

On a Mac, it's ++cmd+opt+k++. Page through the log with ++pg-up++ and ++pg-dn++.
```
:::

:::example{label="Custom keys"}
```md
Hold ++shift++ and press ++"Duck Button"++ to page the rubber duck.

Deploy with ++ctrl+alt+"🍕"++ on Fridays only.
```
:::
::

## Features

- Each key renders as a `<kbd>`, and the whole shortcut sits in a `.ckb` span.
- Keys get their usual names, so `ctrl` reads Ctrl and `pg-dn` reads Page Down.
- A quoted key shows any text.
- One unknown name leaves the shortcut as text, so a typo never renders as a key.
- No styles and no components.

## Usage

Write keys between `++` and `++`, joined by single `+` signs, with no spaces.

::example
```md
++ctrl+alt+del++
```
::

It renders as:

```html
<span class="ckb"><kbd class="ckb-control">Ctrl</kbd><span>+</span><kbd class="ckb-alt">Alt</kbd><span>+</span><kbd class="ckb-delete">Del</kbd></span>
```

Each named key gets a `ckb-` class with its full name, whichever alias you wrote, so `ctrl` and `control` both give `ckb-control`.

### Key names

Use a key's name or one of its aliases, in any case. Letters and digits render uppercase, and `f1` to `f24` as F1 to F24. [Names](#names) lists the rest.

::example
```md
++cmd+opt+k++ ++shift+f5++ ++pg-up++
```
::

### Quoted keys

Use single or double quotes around a key to show any text. Put a backslash before a quote inside. A quoted key gets no class.

::example
```md
++ctrl+"Fire \"all\""++ ++'Any Key'++
```
::

### Separator

Use the `separator` option to change what sits between two keys. `""` puts nothing between them.

```ts
keys({ separator: " " });
```

### Custom keys

Use the `keys` option to add keys, or to give built-in ones new labels. Name each key by its full name.

```ts
keys({ keys: { hyper: "Hyper", control: "Control" } });
```

Then `++hyper+k++` renders Hyper and K, and `++ctrl+k++` renders Control and K.

## Examples

### What stays text

One unknown name leaves the whole shortcut as text, so `++ctrl+nope++` shows as written. Quote the key to show it anyway.

Text also stays text when:

- it has spaces inside, as in `++ctrl + k++`
- the `++` follows a letter, digit, `_`, or `+`, as in `C++`
- the `++` follows `{`, which opens an insertion in comark-critic
- it sits in a code span, or is written `\+\+`

::example
```md
++ctrl+nope++ and C++ stay as written.
```
::

### Styling

The plugin adds no styles, and browsers show `<kbd>` in a monospace font. To draw keycaps:

```css
.ckb kbd {
  padding: 0.1em 0.4em;
  border: 1px solid color-mix(in oklab, currentColor 25%, transparent);
  border-bottom-width: 2px;
  border-radius: 0.3em;
  font-size: 0.85em;
}
.ckb > span {
  padding: 0 0.2em;
}
```

The `ckb-` class on each key picks one out, for example to draw `.ckb-command` as ⌘.

### With other plugins

The plugin reads `++` before emphasis, so `**++esc++**` is a bold key. comark-critic's `{++insertion++}` starts with a `{`, which keys never follow, so the two plugins work together in any order.

### Attributes

Attributes after a shortcut, `++esc++{.danger}`, go on its `.ckb` span. A class there replaces `ckb` instead of joining it.

## API

### Names

Names aren't case sensitive. Letters and digits render uppercase, `f1` to `f24` as F1 to F24, and these as their usual labels:

| Keys | Write |
| --- | --- |
| Modifiers | `ctrl`, `alt`, `shift`, `cmd`, `opt`, `option`, `meta`, `super`, `win`, `fn`, `altgr` |
| Editing | `enter`, `return`, `tab`, `esc`, `space`, `backspace`, `bksp`, `del`, `ins`, `caps-lock` |
| Moving | `up`, `down`, `left`, `right`, `home`, `end`, `pg-up`, `pg-dn`, `page-up`, `page-down` |
| Others | `print-screen`, `prtsc`, `menu` |
| Punctuation | `plus`, `minus`, `equal`, `comma`, `period`, `slash`, `backslash`, `semicolon`, `colon`, `grave`, `tilde`, `bracket-left`, `bracket-right`, `brace-left`, `brace-right`, `less`, `greater`, `question`, `exclam`, `bar`, `underscore`, `single-quote`, `double-quote` |

The names and aliases are pymdownx.keys'. Its numpad, media, browser, mouse, and left and right modifier keys are left out. Add the ones you need with the `keys` option.

### Options

The options go under `keys` in `comarkUi()`, or to `keys()` when you use the plugin alone.

| Option | Default | Description |
| --- | --- | --- |
| `separator` | `"+"` | What sits between two keys. `""` puts nothing between them. |
| `keys` | `{}` | More keys, or new labels for built-in ones, by full name: `{ hyper: "Hyper", control: "Control" }`. |

### Package

comark-ui brings `comark-keys` and registers it. To use it alone, install it and register the plugin:

```sh
pnpm add comark @comark/html comark-keys
```

```ts
import { parseMarkdown } from "comark";
import keys from "comark-keys";

const document = await parseMarkdown(markdown, {
  plugins: [keys()],
});
```
