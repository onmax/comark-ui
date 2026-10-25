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

For a prose badge, `color` is `primary` (default), `secondary`, `success`, `info`, `warning`, `error`, or `neutral`. The plugin shows any other color as primary and reports it, and it reports an empty badge. Nuxt UI's own prose badge ignores `color` and is always primary.

## Write badges

- Keep a badge to a word or two, such as a version or a status, and pick the color by meaning: `warning` for deprecated, `success` for new or stable, `error` for removed, and `info` for a version.
- A badge in a heading joins the heading's id, so `## useFetch :badge[deprecated]` links as `#usefetch-deprecated`. Link to that id, or put the badge in the text under the heading to keep `#usefetch`.
- The plugin drops `{#id}` and `{.class}` on a badge without a report, so set its look with `color` or the theme.

## Image and live badges

Use image mode for README-style label/value badges. Static images embed their SVG; live sources load a hosted image and make no network request during parsing.

```md
:badge[Comark UI]{label="built with" icon="package" color="#15803d"}
:badge{source="npm-version" package="@scope/name"}
:badge{source="npm-downloads" package="comark-ui" period="month"}
:badge{source="github-actions" repository="onmax/comark-ui" workflow="ci.yml" branch="main"}
```

- `source`: `static`, `npm-version`, `npm-downloads`, or `github-actions`. A static image needs `value` or bracket text. npm needs `package`; GitHub needs a public `repository` and a YAML `workflow` filename. Set `branch` to select a branch; otherwise GitHub returns the latest run across branches.
- `label` and `value` hold at most 80 characters. Use bound JSON string attributes when text contains quotes or braces; the builder produces these for you.
- `icon`: `none`, `package`, `npm`, `github` for a branch symbol, or `check`. Live sources pick an icon by default.
- `style`: `subtle` or `solid`; `theme`: `light` or `dark`. `color` and `labelColor` accept the semantic names or six-digit hex colors. CI chooses its own status color. Images embed colors and do not inherit the document's CSS.
- `period`: `day`, `week`, or `month` for downloads. Hosted values cache for five minutes for versions, one hour for downloads, and one minute for CI. Failures display `unavailable` for 30 seconds. Downloaded SVGs are snapshots.

The builder at `/badges/` exports Comark, Markdown, an image URL, and SVG. The image endpoint is `/badge.svg`, with the same props as query parameters. Preserve the existing prose syntax for inline tags that should follow the page's theme.

## Register

- In `comark-ui`: on, under the key `badge`, with an optional `{ endpoint }` for live images.
- Alone: `pnpm add comark @comark/html comark-badge`, then `createHtmlRenderer({ plugins: [badge()], components })` with both from `comark-badge/html`. It accepts `{ endpoint }`, an HTTPS URL without credentials, and needs no script. Colors read Nuxt UI's `--ui-*` variables, and primary follows shadcn/ui's `--primary`, else the text color. `comark-badge/vue`, `/react`, and `/svelte` render it too.

Host images with `createBadgeHandler()` from `comark-badge/server`. Generate static SVG with `readBadge()` and `badgeSvg()` from `comark-badge/svg`. The server entry fetches only public APIs and uses no token.
