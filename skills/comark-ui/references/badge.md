# Badges

comark-badge draws a small tinted label for a version, a status, or a deprecation. Use it to tag an API as deprecated or new, or a heading with the release that added it.

## Syntax

```md
## useAsyncData :badge[deprecated]{color="warning"}

Use `useFetch` instead. :badge[v4]{color="info"} :badge[stable]{color="success"}

::badge
**v4.0.0**
::
```

Write a badge inline as `:badge[text]`, or as Nuxt UI's block `::badge` with its text inside. The plugin unwraps the block's paragraph, so it renders as one badge and keeps its inline Markdown.

`color` is the one prop: `primary` (default), `secondary`, `success`, `info`, `warning`, `error`, or `neutral`. The plugin shows any other color as primary and reports it, and it reports an empty badge. Nuxt UI's own prose badge ignores `color` and is always primary.

## Write badges

- Keep a badge to a word or two, such as a version or a status, and pick the color by meaning: `warning` for deprecated, `success` for new or stable, `error` for removed, and `info` for a version.
- A badge in a heading joins the heading's id, so `## useFetch :badge[deprecated]` links as `#usefetch-deprecated`. Link to that id, or put the badge in the text under the heading to keep `#usefetch`.
- The plugin drops `{#id}` and `{.class}` on a badge without a report, so set its look with `color` or the theme.

## Register

- In `comark-ui`: on, under the key `badge`, with no options.
- Alone: `pnpm add comark @comark/html comark-badge`, then `createHtmlRenderer({ plugins: [badge()], components })` with both from `comark-badge/html`. It takes no options and needs no script. Colors read Nuxt UI's `--ui-*` variables, and primary follows shadcn/ui's `--primary`, else the text color. `comark-badge/vue`, `/react`, and `/svelte` render it too.
