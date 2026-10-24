# Numbered figures and tables

comark-xref numbers labeled images and tables in document order, and turns `:ref{#id}` into a link that reads "Figure 2". Use it when the text refers to its images or tables by number, so the numbers stay right when you add, remove, or reorder them.

## Syntax

```md
The empty state in :ref{#fig-empty} replaces the spinner in :ref{#fig-loading}, and :ref{#tbl-load} has the load times.

![The new empty state on the correlations page](empty.png){#fig-empty}

![The old spinner on the correlations page](loading.png){#fig-loading}

::table{#tbl-load caption="Time to first row, in ms"}
| Page | Before | After |
| --- | --: | --: |
| Correlations | 1840 | 620 |
::
```

- `{#fig-name}` after an image alone in its paragraph makes it a `figure`, captioned "Figure 1: " and its alt text. The plugin doesn't number an image that shares its paragraph with text, and reports it.
- `::table{#tbl-name caption="..."}` around one Markdown table captions it "Table 1: " and its `caption`. A Markdown table takes no id on its own.
- A label is `fig-` or `tbl-`, then letters, digits, `_`, or `-`. The plugin numbers figures and tables apart.
- `:ref{#id}` becomes a link that reads "Figure 1" or "Table 1", to a label above or below it. The plugin drops text in `:ref[...]` and renders a `:ref` to an unknown label as `[id]`. It reports both, and a label used twice.

## Label a screenshot

The plugin also numbers any other element with a `fig-` id as a figure, such as a `::figure` you caption yourself, and adds no caption to it. It numbers a `::screenshot` or `::compare` too, but their HTML drops the id, so the link leads nowhere. Wrap the screenshot in a `::div` that carries the label:

```md
:ref{#fig-toolbar} shows the toolbar on one row.

::div{#fig-toolbar}
:::screenshot{src="after.png" alt="Filter toolbar on one row"}
:::
::
```

## With other plugins

- Leave the title off a labeled image, since its alt text is the caption. comark-figure, on in `comark-ui`, makes a titled image its own figure first, and xref then reports it as sharing its paragraph.
- Keep comark-table's `sort`, `copy`, and `src` off a labeled `::table`. With them, comark-table takes the block, drops the label, and reports `caption` as an unknown prop.
- Write `:ref{#fig-name}` where Pandoc writes `@fig-name`, which comark-chips and comark-github read as a mention.

## Register

- In `comark-ui`: on in every entry. `xref: { figure: "Abbildung", table: "Tabelle" }` sets the words before the numbers, `"Figure"` and `"Table"` by default.
- Alone: `pnpm add comark comark-xref`, then `createHtmlRenderer({ plugins: [xref()] })` with `xref` from `comark-xref`. It has no components and no styles, so it works with any renderer. Its output is `figure`, `figcaption`, `caption`, and `a`, with the classes `cxr`, `cxr-label`, and `cxr-ref` for your own rules.
