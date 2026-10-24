# Folded sections

comark-details folds content behind a summary: `::details` for one block, `::accordion` for a run of questions, and `::collapsible` for optional content. Each one renders as a native `<details>` with a real `<summary>`, so it opens with no script, the browser's search finds the text inside, and it prints.

## Syntax

````md
::details{summary="Full build log"}
```txt
vite v7.1.4 building for production...
✓ 412 modules transformed.
dist/index.html  0.46 kB
```
::

::accordion{type="single" :defaultValue='["0"]'}
:::accordion-item{label="Is it free?" icon="lucide:badge-dollar-sign"}
Yes. Every package is MIT licensed.
:::

:::accordion-item{label="Does it need a script?" description="No. Each item is a native details element."}
:::
::

::collapsible{name="options"}
- `level`: the heading level that starts each step.
- `start`: the number of the first step.
::
````

| Block | Props |
| --- | --- |
| `::details` | `summary` is the text shown while it's closed. Without one it reads "Details", and the plugin reports it. `open` starts it open, and `icon` puts an icon before the summary. |
| `::accordion` | `type` is `multiple` (default), where several items can be open at once, or `single`, where opening one closes the others. `defaultValue` lists the items that start open by position from 0, as `:defaultValue='["0", "2"]'` or `defaultValue="1"`. A `single` accordion opens only the first of them. |
| `:::accordion-item` | `label` is the summary, and it's required. `icon` puts an icon before it, and `description` is the text shown when the item has no content of its own. |
| `::collapsible` | `name` says what it hides, default `properties`, and the summary reads "Show properties" while closed and "Hide properties" while open. `openText` and `closeText` replace "Show" and "Hide", and `icon` puts an icon before the summary. |

On `::details`, a `#summary` slot replaces `summary` and can hold Markdown; write the body after `#default`. `icon` takes a name as in [icon](icon.md), such as `lucide:info`.

## Choose the block

- `::details` for one thing a reader may skip, such as a long log, a stack trace, or the answer to one question.
- `::accordion` for several questions or sections in a row. Put every block inside an `:::accordion-item`, since content between items doesn't render, and an item outside `::accordion` renders on its own.
- `::collapsible` for optional content under a heading or a field, such as the rarely used options in a list of props.

## Register

- In `comark-ui`: on, under the key `details`. Its icons come from the preset's shared resolver, so `icon: { collections }` applies to them.
- Alone: `pnpm add comark @comark/html comark-details`, then `createHtmlRenderer({ plugins: [details()], components })` with both from `comark-details/html`. By default icons come from the Iconify API while parsing. To share one resolver with the page's other plugins, add `comark-icon`, make one with `createIcons()`, and pass it as `details({ iconResolver })`. The output needs no script. `comark-details/vue`, `/react`, and `/svelte` render it too.
