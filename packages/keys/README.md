# comark-keys

[![npm version](https://comark-ui.onmax.me/badge.svg?source=npm-version&package=comark-keys&icon=npm)](https://npmx.dev/package/comark-keys)
[![npm downloads](https://comark-ui.onmax.me/badge.svg?source=npm-downloads&package=comark-keys&period=month&icon=npm)](https://npmx.dev/package/comark-keys)
[![license](https://comark-ui.onmax.me/badge.svg?label=license&value=MIT)](https://npmx.dev/package/comark-keys)
[![docs](https://comark-ui.onmax.me/badge.svg?label=docs&value=comark-ui.onmax.me)](https://comark-ui.onmax.me/keys/)

Keyboard shortcuts in [Comark](https://comark.dev): `++ctrl+shift+k++` renders each key as a `<kbd>`, with the names and aliases of [pymdownx.keys](https://facelessuser.github.io/pymdown-extensions/extensions/keys/). A parse plugin with no components and no styles, so it works in any renderer.

```sh
pnpm add comark comark-keys
```

```ts
import { parseMarkdown } from "comark";
import keys from "comark-keys";

const document = await parseMarkdown(markdown, {
  plugins: [keys()],
});
```

```md
Press ++ctrl+shift+k++ to search, ++cmd+opt+esc++ on a Mac, and ++shift+"Duck Button"++ for help.
```

```html
<span class="ckb"><kbd class="ckb-control">Ctrl</kbd><span>+</span><kbd class="ckb-shift">Shift</kbd><span>+</span><kbd class="ckb-k">K</kbd></span>
```

Keys sit between `++` and `++`, joined by `+`. Names aren't case sensitive and take pymdownx.keys' aliases, so `ctrl` reads Ctrl and `pg-dn` reads Page Down. A quoted key shows its own text. One unknown name leaves the whole shortcut as text, and so do `C++`, `a++ b++`, and comark-critic's `{++insertion++}`.

## Options

| Option | |
| --- | --- |
| `separator` | What sits between two keys. Default `"+"`; `""` puts nothing between them. |
| `keys` | More keys, or new names for built-in ones, by lowercase name: `{ hyper: "Hyper" }`. |

## Credits

The syntax, key names, and aliases are from [pymdownx.keys](https://github.com/facelessuser/pymdown-extensions) by Isaac Muse, MIT.
