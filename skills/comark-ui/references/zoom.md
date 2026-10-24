# Zoom

comark-zoom lets the reader click an image or a `::zoom` block to see it large, and closes it with Escape, Back, or a click around it. Images zoom with no markup. Wrap a table, code block, or diagram in `::zoom` when it's too small to read in place.

## Syntax

```md
::zoom{title="Deploy retry policy"}
| Attempt | Wait before it |
| --- | --- |
| 1 | 1 s |
| 2 | 4 s |
| 3 | 16 s |
::
```

- `::zoom` zooms everything inside it as one item. `title` heads the zoomed view. Items with the same `group` page through one zoomed view, with a strip of them below. `#id` and `.class` go on the block.
- Every content image zooms on its own, with its alt text as the zoomed view's heading. It grows no larger than its file, so give a small image a larger file to open with `{data-zoom-src="dashboard@2x.png"}`.
- An image inside a link keeps its link and doesn't zoom. Images inside `::zoom`, `::carousel`, `::screenshot`, or `::compare` zoom with their block.
- `{zoom=false}` keeps an image from zooming, and `{data-zoom}` makes any element zoom on its own.

comark-zoom reports no problems, so a misspelled prop such as `titel` is dropped silently and passes the linter. Spell `title` and `group` as written here.

## Group or carousel

A `group` leaves each item in its place in the text and pages through them only once one is zoomed. Use it for screenshots that sit apart, each next to the paragraph about it. A `::carousel` puts the items in one place with arrows instead. An item hidden when the view opens, such as one in a closed tab, stays out of its group.

## In the page

The zoomed view fires `comark-zoom:open`, `comark-zoom:change`, and `comark-zoom:close` on the item, and they bubble. The `detail` of `open` and `change` holds the dialog's `header` and `footer`, a `layer` over the zoomed content where a host draws its own pins, and `copyOf(element)` and `originalOf(element)` to map between the page and the zoomed copy. `data-zoom-aside`, a selector, shows a caption beside the zoomed item at its own size, as annotate does with a screenshot's notes.

## Register

- In `comark-ui`: on, as `zoom`. `zoom: { images: false }` leaves images alone, so only `::zoom` blocks and elements marked `{data-zoom}` zoom.
- Alone: `pnpm add comark @comark/html comark-zoom`, then `createHtmlRenderer({ plugins: [zoom()], components })` with both from `comark-zoom/html`. `comark-zoom/vue`, `/react`, and `/svelte` export the same pair for those renderers. The plugin adds a node that starts the script, so pass the components even when only images zoom. A page with no renderer calls `start()` from `comark-zoom/client` once. comark-annotate and comark-carousel zoom their own blocks without it, so register `zoom()` for images and `::zoom`.
