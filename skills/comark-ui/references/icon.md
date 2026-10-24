# Icons

comark-icon draws `:icon` with any of Iconify's 200,000 icons, such as a logo beside a name or a status in a table. It resolves each icon while parsing and writes it into the page as a CSS image, so the reader's browser fetches nothing and runs no script.

## Syntax

```md
| Check | Result |
| --- | --- |
| Unit tests | :icon{name="lucide:circle-check" label="Passed"} |
| Visual diff | :icon{name="lucide:circle-x" label="Failed"} |

Built with :icon{name="logos:vue"} Vue and :icon{name="logos:vitejs"} Vite.
```

| Prop | What it does |
| --- | --- |
| `name` | Required. `set:name`, such as `lucide:apple`, from a set at https://icones.js.org. Nuxt UI's `i-lucide-apple` works too. A URL, or a path that starts with `/`, `./`, or `../`, draws that image instead. `:name="frontmatter.icon"` takes the name from the frontmatter. |
| `label` | What the icon means, for screen readers. Without one the icon is decoration, and they skip it. |

An icon is as tall as the text. One in a single color, such as Lucide's, paints in the color of the text around it. One with colors of its own, such as `logos:vue`, keeps them.

Give a `label` when the icon says something the words around it don't, such as a lone status in a table cell. Leave it out when a word beside the icon says the same. Copy each name from icones.js.org. The plugin leaves out an icon it can't draw, from a misspelled name, an unknown set, or a failed download, and reports it.

## Register

- In `comark-ui`: on. Its `icon` option takes `collections` and `fetch`, as below, and its resolver also draws the icons of cards, details, file trees, tabs, and code actions.
- Alone: `pnpm add comark @comark/html comark-icon`, then `createHtmlRenderer({ plugins: [icon()], components })` with both from `comark-icon/html`. `comark-icon/vue`, `/react`, and `/svelte` render it too. With no options it downloads each icon from the Iconify API while parsing, once per process. To build offline, install the sets you use and pass them, as in `icon({ collections: { lucide }, fetch: false })` with `icons as lucide` from `@iconify-json/lucide`. A collection can also map names to SVG markup, for icons of your own, and `fetch` can be the URL of your own Iconify API. Plugins that draw icons take an `Icons` from `createIcons()`, so pass the same one to each and set the options once.
