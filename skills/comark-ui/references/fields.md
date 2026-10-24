# Props and options

comark-fields lists a component's props or a function's options, each with its type, its default, and a required tag, and nests an object's properties under it. Use it in API docs, or in a review that adds or changes options.

## Syntax

```md
::field-group
:::field{name="title" type="string" required}
The text above the card's content.
:::

:::field{name="options" type="object" default="{}"}
What the plugin takes.

::::field{name="download" type="boolean" default="true"}
Inlines each image while parsing.
::::
:::
::
```

| Prop | What it does |
| --- | --- |
| `name` | Required. The prop, option, or parameter, shown in code. |
| `type` | Its type, as you'd write it in TypeScript. |
| `required` | A bare `required` adds a required tag. `:required="false"` leaves it off. |
| `default` | Its default, shown in code. `:default="0"` and `:default='{"a":1}'` show as written. |
| `description` | The text shown when the field has no content of its own, or above its nested fields. On a field with text inside, the plugin ignores it and reports it. |

The text inside a field is its description. Fields inside a field describe an object's properties, with one more colon for each level. `::field-group` stacks fields with a line between them, and a field works on its own too. Nuxt UI's own field has no `default` and ignores it.

To fold rarely used options away, put their fields in a `::collapsible` from [details](details.md), as Nuxt UI's docs do:

```md
::field{name="options" type="object"}
:::collapsible{name="options"}
::::field{name="sync" type="string"}
A key shared by blocks that switch together.
::::
:::
::
```

## Register

- In `comark-ui`: on, under the key `fields`, with no options.
- Alone: `pnpm add comark @comark/html comark-fields`, then `createHtmlRenderer({ plugins: [fields()], components })` with both from `comark-fields/html`. It takes no options and needs no script. `comark-fields/vue`, `/react`, and `/svelte` render it too.
