# Keyboard shortcuts

comark-keys renders `++ctrl+shift+k++` as one `<kbd>` per key, joined by `+`, each named the way people read it. Use it wherever a guide or a bug report tells the reader which keys to press.

## Syntax

```md
Press ++ctrl+shift+k++ to open the pigeon counter, and ++esc++ to close it. On a Mac, it's ++cmd+opt+k++.

Hold ++shift++ and press ++"Duck Button"++ to page the rubber duck.
```

- Write the keys between `++` and `++`, joined by single `+` signs, with no spaces. Names aren't case sensitive.
- Full names (`control`, `command`, `escape`, `delete`, `arrow-up`) and pymdownx.keys' other aliases work too. Letters and digits render uppercase, `f1` to `f24` as F1 to F24, and these names as their usual labels:
  - Modifiers: `ctrl`, `alt`, `shift`, `cmd`, `opt`, `option`, `meta`, `super`, `win`, `fn`, `altgr`.
  - Editing: `enter`, `return`, `tab`, `esc`, `space`, `backspace`, `bksp`, `del`, `ins`, `caps-lock`.
  - Moving: `up`, `down`, `left`, `right`, `home`, `end`, `pg-up`, `pg-dn`, `page-up`, `page-down`.
  - Others: `print-screen`, `prtsc`, `menu`.
  - Punctuation, by name: `plus`, `minus`, `equal`, `comma`, `period`, `slash`, `backslash`, `semicolon`, `colon`, `grave`, `tilde`, `bracket-left`, `bracket-right`, `brace-left`, `brace-right`, `less`, `greater`, `question`, `exclam`, `bar`, `underscore`, `single-quote`, `double-quote`.
- Quote a key, in single or double quotes, to show any other text, such as a button, a mouse click, or a numpad key: `++ctrl+"Click"++`. A backslash escapes a quote inside.
- `return` reads Enter. Write `++"Return"++` for a Mac's label.

One unknown name, a space, or a bare symbol, as in `++ctrl+/++`, leaves the whole shortcut as text, and nothing reports it. Check each name against the list, or quote the key. `++` right after a letter, a digit, or `+` never opens a shortcut, so `C++` stays text.

## Register

- In `comark-ui`: on by default. `keys: { separator: "", keys: { hyper: "Hyper" } }` changes what sits between two keys (default `"+"`; `""` puts nothing) and adds keys or renames built-in ones, by lowercase name.
- Alone: `pnpm add comark comark-keys`, then `plugins: [keys()]` with `import keys from "comark-keys"`, and the same options. It ships no styles, and browsers show `<kbd>` in a monospace font, so draw keycaps with the page's CSS on `.ckb kbd`. Each named key also gets a class with its full name, such as `ckb-control`. A `{.class}` after a shortcut replaces its `ckb` class, so skip it when the page styles `.ckb`.
