# Table of contents

comark-outline turns `::toc` into a nested list of links to the document's headings. Put one in a review or a docs page that runs past a screen or two, so the reader sees what it covers and jumps to the part they own.

## Syntax

```md
The redesign moves the filters into one row and adds an empty state.

::toc{title="On this page"}
::

## Filters

### Toolbar

## Empty state
```

| Prop | What it does |
| --- | --- |
| `depth` | The deepest heading it lists, a whole number from 2 to 6. Default 3, so h2 and h3. |
| `title` | A small title above the list. It also names the `nav` for screen readers; without it, the name is "Contents". |

- Close the block with `::` on the next line, with nothing between. The plugin drops and reports anything inside.
- Put it after the summary paragraph, and keep headings short, since they become the links.
- The list starts at h2, since the h1 is the page's title. Each heading nests under the closest heading above it of a higher level, so a skipped level still nests.
- It lists headings inside other blocks too, such as each `###` step of a `::steps`. Set `depth=2` to keep them out.
- Each link goes to the heading's id, its own `{#id}` when it has one, and reads as the heading's plain text.
- Every `::toc` lists the whole document, wherever it sits. With no heading from h2 to `depth`, it renders nothing, and the plugin reports it.
- Write `::toc` where other tools use `[[toc]]`, which Comark reads as a span.

## Register

- In `comark-ui`: on in every entry, with no options.
- Alone: `pnpm add comark @comark/html comark-outline`, then `createHtmlRenderer({ plugins: [outline()], components })` with both from `comark-outline/html`. `comark-outline/vue`, `/react`, and `/svelte` render it too. It reads the headings itself, so it works in any plugin order and without Comark's toc plugin, which only fills `meta.toc` for a sidebar. The npm name is `comark-outline` because npm refused `comark-toc`.
