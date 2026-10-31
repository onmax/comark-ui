# comark-fields

[![npm version](https://comark-ui.onmax.me/badge.svg?source=npm-version&package=comark-fields&icon=npm)](https://npmx.dev/package/comark-fields)
[![npm downloads](https://comark-ui.onmax.me/badge.svg?source=npm-downloads&package=comark-fields&period=month&icon=npm)](https://npmx.dev/package/comark-fields)
[![license](https://comark-ui.onmax.me/badge.svg?label=license&value=MIT)](https://npmx.dev/package/comark-fields)
[![docs](https://comark-ui.onmax.me/badge.svg?label=docs&value=comark-ui.onmax.me)](https://comark-ui.onmax.me/fields/)

Props, options, and parameters in Nuxt UI's `::field` syntax: each with its type, whether it's required, and its default, with an object's properties nested under it. A [Comark](https://comark.dev) plugin for HTML, Vue, React, and Svelte.

```sh
pnpm add comark comark-fields
```

```ts
import { createHtmlRenderer } from "@comark/html";
import fields, { components } from "comark-fields/html";

const render = createHtmlRenderer({ plugins: [fields()], components });
```

```md
::field-group
:::field{name="options" type="object" required default="{}"}
What the plugin takes.

::::field{name="sync" type="string"}
A key shared by blocks that switch together.
::::
:::
::
```

`::field` takes `name`, `type`, `required` (Comark writes it as `:required="true"`), `default`, and `description`; its content is its description, and `:::field` blocks inside describe an object's properties. The plugin adds a problem to `meta.issues` for a field without a `name`, so a host can reject a document before publishing it.

## Renderers

| Renderer | Import |
| --- | --- |
| `@comark/html` | `comark-fields/html`: the styles are inlined |
| `@comark/vue` | `comark-fields/vue` |
| `@comark/react` | `comark-fields/react` |
| `@comark/svelte` | `comark-fields/svelte` |

Each entry exports the parse plugin as `default` and the renderer's `components`. The Vue, React, and Svelte components add the styles when they mount; import `comark-fields/style.css` with your styles so a server-rendered page doesn't shift.

The styles follow shadcn/ui: they read its CSS variables, such as `--muted-foreground` and `--border`, when the page has them, and use its neutral theme otherwise. Set the shared `--comark-*` tokens to theme every plugin at once; the rules sit in a `comark` CSS layer, so any plain rule of your own wins, except the top and bottom margins of a field's description, which are `!important`. To override those, use `!important` in a cascade layer declared before `comark`.
