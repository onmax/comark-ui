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

Use image mode for README-style label/value badges. Static images embed their SVG. Live sources fetch npm or GitHub data while parsing and embed it too, as of the build; with `download: false`, or when the data is unavailable, they load a hosted image.

```md
:badge[Comark UI]{label="built with" icon="package" color="#15803d"}
:badge{source="npm-version" package="@scope/name"}
:badge{source="npm-downloads" package="comark-ui" period="month"}
:badge{source="github-actions" repository="onmax/comark-ui" workflow="ci.yml" branch="main"}
```

- `source`: `static`, `npm-version`, `npm-downloads`, or `github-actions`. A static image needs `value` or bracket text. npm needs `package`; GitHub needs a public `repository` and a YAML `workflow` filename. Set `branch` to select a branch; otherwise GitHub returns the latest run across branches.
- `label` and `value` hold at most 80 characters. Use bound JSON string attributes when text contains quotes or braces; the builder produces these for you.
- `icon`: `none`, `package`, `npm`, `npmx`, `nuxt`, `github`, `comark`, `shadcn`, or `check`. npm sources pick npm, npmx, or Nuxt to match the preset; GitHub Actions uses GitHub. Explicit icons override these defaults.
- `preset`: `default`, `npmx`, or `nuxt`. npmx uses monospace text and a colored slash. Nuxt uses a navy label and green value block, with status colors for CI. Branded presets ignore `style` and `labelColor`; `theme` still applies, though Nuxt keeps its palette and only adds an outline in dark mode.
- `style`: `shadcn` by default, `subtle`, or `solid`; `theme`: `auto` by default, following the page's light or dark theme (on GitHub too), or `light` or `dark`. `color` and `labelColor` accept semantic names or six-digit hex colors. In the default preset, shadcn draws an outline with neutral text; `labelColor` applies to subtle and solid backgrounds. CI chooses its own status color. Images embed colors and do not inherit the document's CSS.
- `period`: `day`, `week`, or `month` for downloads. Hosted values cache for five minutes for versions, one hour for downloads, and one minute for CI. Failures display `unavailable` for 30 seconds. Downloaded SVGs are snapshots.

The builder at `/badges/` lives in the docs layout, shares its configuration and export format in the query string, and exports Comark, Markdown, an image URL, and SVG. The image endpoint is `/badge.svg`, with the same props as query parameters. Preserve the existing prose syntax for inline tags that should follow the page's theme.

## Register

- In `comark-ui`: on, under the key `badge`, with optional `{ endpoint, download }` for live images.
- Alone: `pnpm add comark @comark/html comark-badge`, then `createHtmlRenderer({ plugins: [badge()], components })` with both from `comark-badge/html`. It accepts `{ endpoint }`, an HTTPS URL without credentials, and `{ download: false }` to skip fetching while parsing, and needs no script. Colors read Nuxt UI's `--ui-*` variables, and primary follows shadcn/ui's `--primary`, else the text color. `comark-badge/vue`, `/react`, and `/svelte` render it too.

Host images with `createBadgeHandler()` from `comark-badge/server`. Generate static SVG with `readBadge()` and `badgeSvg()` from `comark-badge/svg`. The server entry fetches only public APIs and uses no token.
