# comark-icon

Iconify icons in Markdown, written as `:icon{name="lucide:apple"}`. Icons are resolved while parsing and drawn as CSS images, so the page asks no server for them and they show without a script. An icon in one color takes the color of the text around it; a logo keeps its own. A [Comark](https://comark.dev) plugin for HTML, Vue, React, and Svelte.

```sh
pnpm add comark comark-icon
```

```ts
import { createHtmlRenderer } from "@comark/html";
import icon, { components } from "comark-icon/html";

const render = createHtmlRenderer({ plugins: [icon()], components });
```

```md
Press :icon{name="lucide:command"} K to search.

Built with :icon{name="logos:vue" label="Vue"}.
```

`name` is `set:name`, from any set on [icones.js.org](https://icones.js.org), or an image URL. Nuxt UI's `i-lucide-apple` works too. Without a `label` the icon is decoration and screen readers skip it.

With no options, icons come from the Iconify API, fetched once per process. To build offline, install the sets you use and pass them: `icon({ collections: { lucide }, fetch: false })`, with `import { icons as lucide } from "@iconify-json/lucide"`. A set can also be SVG markup by name, for icons of your own. `fetch` takes the URL of an Iconify API of your own, too.

The plugin adds every problem to `meta.issues` and leaves the icon out: an icon without a `name`, a name that isn't `set:name` or a URL, a set or icon Iconify doesn't have, and a request that failed. Each issue names the icon and says how to fix it.

## Renderers

| Renderer | Import |
| --- | --- |
| `@comark/html` | `comark-icon/html`: the styles are inlined once per document |
| `@comark/vue` | `comark-icon/vue` |
| `@comark/react` | `comark-icon/react` |
| `@comark/svelte` | `comark-icon/svelte` |

Each entry exports the parse plugin as `default` and the renderer's `components`. Import `comark-icon/style.css` with your styles when you render on a server.

An icon is a `.ci`, `1em` tall; set `--comark-icon-size` to change it. The rules sit in a `comark` CSS layer, so any plain rule of your own wins; see the icon's [Theming page](https://comark-ui.onmax.me/icon/#theme).

## For other plugins

`createIcons(options)` returns a resolver with `resolve(names)`, which never throws and maps each name to its icon or its problem; `describeIconProblem()` words a problem the way this plugin does. Pass one resolver to every plugin that draws icons, so a page sets its options once, and draw with `iconHtml()` and `iconStyles(state)` from `comark-icon/html` or the `Icon` component. See [Guides](https://comark-ui.onmax.me/icon/#examples).
