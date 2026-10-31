---
title: Fields
description: Props, options, and parameters, written in Markdown.
keywords: props, API reference, options, parameters, arguments, attributes, types, defaults, required, prop table
tagline: A list of a component's props or a function's options, with their types, defaults, and whether they're required.
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

## Features

- Each field is a row: its name in code, its type, a required tag, its default, and its description under them.
- Fields inside a field describe an object's properties, and sit indented under it.
- A field works on its own, or in a `::field-group` with a line between fields.
- Nuxt UI's syntax.

## Usage

Write a `::field` with its `name` and its description inside.

::example
```md
::field{name="title"}
The text above the card's content.
::
```
::

### Type

Use the `type` prop to show the field's type, as you'd write it in TypeScript.

::example
```md
::field{name="title" type="string"}
The text above the card's content.
::
```
::

### Required

Use the `required` prop to add a required tag. Comark writes a bare `required` as `:required="true"`, and `:required="false"` leaves it off.

::example
```md
::field{name="title" type="string" required}
The text above the card's content.
::
```
::

### Default

Use the `default` prop to show the field's default in code. `:default="0"` and `:default='{"a":1}'` show as written.

::example
```md
::field{name="color" type="string" default="primary"}
Tints the icon and the hovered border.
::
```
::

> [!NOTE]
> Nuxt UI's field has no `default`, so Nuxt UI ignores it.

### Description

Use the `description` prop to set the field's text when it has no content of its own, or when it holds nested fields.

::example
```md
::field{name="sync" type="string" description="A key shared by blocks that switch together."}
::
```
::

> [!NOTE]
> On a field with content and no nested fields, `description` is ignored and adds an issue. Write the description as the field's first paragraph instead.

### Nested fields

Put `:::field` blocks inside a field to describe an object's properties. They sit indented under it.

::example
```md
::field{name="options" type="object"}
What the plugin takes.

:::field{name="sync" type="string"}
A key shared by blocks that switch together.
:::
::
```
::

### Field group

Use `::field-group` to set fields one under another, with a line between them.

::example
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
::

## Examples

### Hiding optional fields

A long list of options reads better with the rarely used ones folded away. With [comark-details](/details/), put them in a `::collapsible`, as Nuxt UI's docs do:

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

### Props

| Prop | Default | Description |
| --- | --- | --- |
| `name` | — | Required. The prop, option, or parameter, shown in code. |
| `type` | — | Its type, as you'd write it in TypeScript. |
| `required` | `false` | Adds a required tag. |
| `default` | — | Its default, shown in code. A bound value, such as `:default="0"`, shows as written. |
| `description` | — | The text shown when the field has no content of its own, or first when it holds nested fields. |

`::field-group` takes no props.

### Options

The plugin takes no options. In `comarkUi()`, `fields: false` turns it off.

### Your own renderer

The parse plugin replaces each field's attributes with the ones it renders from, all strings, and keeps its content:

```json
["field", { "name": "options", "type": "object", "required": "true", "default": "{}" },
  ["p", {}, "What the plugin takes."],
  ["field", { "name": "sync", "type": "string" }, "A key."]]
```

### Issues

The plugin adds every problem to `meta.issues`, as [Validation](/guide/validation/) describes:

- A field without a `name`.
- A prop it doesn't read.
- A `description` prop on a field with content and no nested fields, which hides the prop.

Each one has its own rule in [Doctor](/doctor/).

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

Fields follow the shared tokens in [Theming](/guide/theming/), and one variable of their own.

### Shared tokens

| Token | Used for |
| --- | --- |
| `--comark-foreground` | Names |
| `--comark-muted` | Types, defaults, descriptions |
| `--comark-border` | The lines between fields, the guide line beside an object's properties |
| `--comark-radius` | The required tag's corners |
| `--comark-font` | Text |

### Variables

Set it on `.cfl`:

| Variable | Default | Used for |
| --- | --- | --- |
| `--cfl-required` | `--comark-danger` | The required tag |

### Classes

| Selector | Is |
| --- | --- |
| `.cfl` | A field |
| `.cfl-head` | The row of its name, type, required tag, and default |
| `.cfl-name`, `.cfl-type`, `.cfl-required`, `.cfl-default` | The parts of that row |
| `.cfl-body` | Its description and nested fields |
| `.cfl-group` | A field group |

### Important rules

The rules sit in a `comark` CSS layer, so any plain rule of your own wins, except the top and bottom margins of a field's description. Those are `!important`. To override them, use `!important` in a cascade layer declared before `comark`. An unlayered important rule loses.
