# comark-keys

[![npm version](https://npmx.dev/api/registry/badge/version/comark-keys)](https://npmx.dev/package/comark-keys)
[![npm downloads](https://npmx.dev/api/registry/badge/downloads-month/comark-keys)](https://npmx.dev/package/comark-keys)
[![install size](https://npmx.dev/api/registry/badge/size/comark-keys)](https://npmx.dev/package/comark-keys)
[![license](https://npmx.dev/api/registry/badge/license/comark-keys)](https://npmx.dev/package/comark-keys)
[![docs](https://img.shields.io/badge/docs-comark--ui.onmax.me-14b8a6?labelColor=0a0a0a)](https://comark-ui.onmax.me/keys/)

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
