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
- An image inside a link keeps its link and doesn't zoom. Images inside `::zoom` zoom with their block, and so do images inside `::carousel`, `::screenshot`, or `::compare` when comark-carousel or comark-annotate draws it. A block of your own with one of those names leaves its images to zoom on their own.
- `{zoom=false}` keeps an image from zooming, and `{data-zoom}` makes any element zoom on its own.

## Screenshots in a table

```md
| Portal term | Engine term | Where it shows |
| --- | --- | --- |
| Forecast | `projection` | ![Forecast page, header](forecast.png){width=1280 height=800 link="https://app.example.com/forecast"} |
| Scenario | `run` | ![Scenario picker](picker.png){width=1280 height=800} ![Scenario detail](detail.png){width=1280 height=800} |
```

- An image in a table cell is a thumbnail at most 4rem high and 8rem wide, at its own ratio, so one reference table can hold a screenshot per row. A click, Enter, or Space zooms it to the size of its file, and it loads only near the screen. Several images in one cell sit side by side and wrap.
- Give `width` and `height`, the file's size in pixels, so the row has its height before the image loads. Without them the thumbnail shows whole inside a 3:2 box.
- `link` names the page the image shows. The zoomed view links to it beside the title, so the click on the image still zooms. Don't wrap the image in a Markdown link: a linked image doesn't zoom and isn't a thumbnail. `link` works on any zoomable image, not only in a table.
- The alt text is the image's accessible name and the zoomed view's heading, so say what the screenshot shows.
- A `::screenshot` doesn't fit a cell. For marks and notes, zoom is not enough: put the annotated `::screenshot` under the table and link to it.

comark-zoom reports no problems, so a misspelled prop such as `titel` is dropped silently and passes the linter. Spell `title` and `group` as written here.

## Group or carousel

A `group` leaves each item in its place in the text and pages through them only once one is zoomed. Use it for screenshots that sit apart, each next to the paragraph about it. A `::carousel` puts the items in one place with arrows instead. An item hidden when the view opens, such as one in a closed tab, stays out of its group.

## In the page

The zoomed view fires `comark-zoom:open`, `comark-zoom:change`, and `comark-zoom:close` on the item, and they bubble. The `detail` of `open` and `change` holds the dialog's `header` and `footer`, a `layer` over the zoomed content where a host draws its own pins, and `copyOf(element)` and `originalOf(element)` to map between the page and the zoomed copy. `data-zoom-aside`, a selector, shows a caption beside the zoomed item at its own size, as annotate does with a screenshot's notes.

## Register

- In `comark-ui`: on, as `zoom`. `zoom: { images: false }` leaves images alone, so only `::zoom` blocks, elements marked `{data-zoom}`, and images in table cells zoom; `thumbnails: false` leaves those alone too. Data URI images get dimensions by default; one authored pixel side gets the other at the file's ratio. Images with both sides or a side such as `50%` keep them. `zoom: { size: true }` also measures remote images while parsing; use it only for trusted documents, since requests follow redirects and can reach private networks. `zoom: { size: false }` disables measurement. Alone, pass the same options to `zoom()`.
- Alone: `pnpm add comark @comark/html comark-zoom`, then `createHtmlRenderer({ plugins: [zoom()], components })` with both from `comark-zoom/html`. `comark-zoom/vue`, `/react`, and `/svelte` export the same pair for those renderers. The plugin adds a node that starts the script, so pass the components even when only images zoom. A page with no renderer calls `start()` from `comark-zoom/client` once. comark-annotate and comark-carousel zoom their own blocks without it, so register `zoom()` for images and `::zoom`.
