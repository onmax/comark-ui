---
title: Fields
description: Props, options, and parameters, written in Markdown.
keywords: props, API reference, options, parameters, arguments, attributes, types, defaults, required, prop table
tagline: List a component's props or a function's options with their types, defaults, and whether they're required, with an object's properties nested under it. Nuxt UI's syntax, with no script.
group: Docs blocks
icon: list-tree
blurb: Props and options
credits: 'Syntax from <a href="https://ui.nuxt.com/docs/typography">Nuxt UI</a>''s prose fields.'
---

::examples
:::example{label="Props"}
```md
::field-group
:::field{name="title" type="string" required}
The text above the card's content.
:::

:::field{name="color" type="string" default="primary"}
Tints the icon and the hovered border.
:::
::
```
:::

:::example{label="Nested"}
```md
::field{name="options" type="object"}
What the plugin takes.

:::field{name="iconResolver" type="Icons"}
Resolves icons, from `createIcons()` in comark-icon.
:::

:::field{name="download" type="boolean" default="true"}
Inlines each image while parsing.
:::
::
```
:::
::

Each field is a row: its name in code, its type, a required tag, its default, and its description under them. Fields inside a field describe an object's properties and sit indented under it.

## Usage

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

| Prop | What it does |
| --- | --- |
| `name` | Required. The prop, option, or parameter, shown in code. |
| `type` | Its type, as you'd write it in TypeScript. |
| `required` | Adds a required tag. Comark writes a bare `required` as `:required="true"`, and `:required="false"` leaves it off. |
| `default` | Its default, shown in code. `:default="0"` and `:default='{"a":1}'` show as written. |
| `description` | The text shown when the field has no content of its own. |

The content inside a `::field` is its description, and `:::field` blocks inside it describe an object's properties. `::field-group` sets fields one under another with a line between them. A field works on its own too.

This is Nuxt UI's syntax. Nuxt UI's field has no `default`, so it ignores that prop.

### Issues

The plugin adds every problem to `meta.issues`, as [Validation](/guide/validation/) describes:

- A field without a `name`.
- A prop it doesn't read.
- A `description` prop on a field with content, which hides the prop.

Each issue names the field, by its name or else its type, and says how to fix it. Each one has its own rule in [Doctor](/doctor/).

## Examples

### Hiding optional fields

A long list of options reads better with the rarely used ones folded away. With comark-details, put them in a `::collapsible`, as Nuxt UI's docs do:

```md
::field{name="options" type="object"}
:::collapsible{name="options"}
::::field{name="sync" type="string"}
A key shared by blocks that switch together.
::::
:::
::
```

## API

The plugin takes no options. In `comarkUi()`, `fields: false` turns it off.

### Your own renderer

The parse plugin replaces each field's attributes with the ones it renders from, all strings, and keeps its content:

```json
["field", { "name": "options", "type": "object", "required": "true", "default": "{}" },
  ["p", {}, "What the plugin takes."],
  ["field", { "name": "sync", "type": "string" }, "A key."]]
```

### Package

comark-ui brings `comark-fields` and registers it. To use it alone, install it:

```sh
pnpm add comark @comark/html comark-fields
```

Register the plugin and pass the renderer's `components`:

```ts
import { createHtmlRenderer } from "@comark/html";
import fields, { components } from "comark-fields/html";

const render = createHtmlRenderer({ plugins: [fields()], components });
```

For Vue, React, or Svelte, import from `comark-fields/vue`, `comark-fields/react`, or `comark-fields/svelte`. The components add the styles when they mount. When you render on a server, import `comark-fields/style.css` with your own styles so the page doesn't shift. [Renderers](/guide/renderers/) covers using it with other plugins.

## Theme

A field is a `<div class="cfl">` with a `.cfl-head` holding `.cfl-name`, `.cfl-type`, `.cfl-required`, and `.cfl-default`, then its content in `.cfl-body`. A group is a `<div class="cfl-group">`. They read these [shared tokens](/guide/theming/):

| Token | Used for |
| --- | --- |
| `--comark-foreground` | Names |
| `--comark-muted` | Types, defaults, descriptions |
| `--comark-border` | The lines between fields, the guide line beside an object's properties |
| `--comark-radius` | The required tag's corners |
| `--comark-font` | Text |

The required tag takes shadcn/ui's `--destructive`, or red without it; set `--cfl-required` on `.cfl` to change it. The rules sit in a `comark` CSS layer, so any plain rule of your own wins, except the top and bottom margins of a field's description, which are `!important`, because a page's own paragraph and list margins are almost always unlayered and would open a gap under the name. To override those margins, use `!important` in a cascade layer declared before `comark`; an unlayered important rule loses because important declarations reverse layer order.
