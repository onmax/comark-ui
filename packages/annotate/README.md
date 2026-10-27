# comark-annotate

[![npm version](https://comark-ui.onmax.me/badge.svg?source=npm-version&package=comark-annotate&icon=npm)](https://npmx.dev/package/comark-annotate)
[![npm downloads](https://comark-ui.onmax.me/badge.svg?source=npm-downloads&package=comark-annotate&period=month&icon=npm)](https://npmx.dev/package/comark-annotate)
[![license](https://comark-ui.onmax.me/badge.svg?label=license&value=MIT)](https://npmx.dev/package/comark-annotate)
[![docs](https://comark-ui.onmax.me/badge.svg?label=docs&value=comark-ui.onmax.me)](https://comark-ui.onmax.me/annotate/)

Hand-drawn marks, numbered notes, and arrows on screenshots, written in Markdown. A [Comark](https://comark.dev) plugin that renders static HTML.

[![A dashboard screenshot with handwritten notes above and beside it, each pointing at a value with a hand-drawn arrow](https://comark-ui.onmax.me/readme.png)](https://comark-ui.onmax.me/annotate/)

**[Docs and live demo](https://comark-ui.onmax.me/annotate/)**

```sh
pnpm add comark @comark/html comark-annotate
```

```ts
import { createHtmlRenderer } from "@comark/html";
import annotate, { components } from "comark-annotate/html";

const render = createHtmlRenderer({ plugins: [annotate()], components });
```

```md
::compare
:::screenshot{src="before.png" alt="Filter toolbar wrapping" viewport="900x360"}
::::annotation{x=3.6 y=20.6 w=92.9 h=31.4 color="red"}
Moon phase and vibes don't fit, so the toolbar wraps onto a second row.
::::
:::

:::screenshot{src="after.png" alt="Filter toolbar on one row" viewport="900x360"}
::::annotation{x=87.6 y=24.2 w=7.4 h=9.9 mark="check" color="green"}
**Apply** lines up with the chips.
::::
:::
::
```

Coordinates are percentages of the image, written as numbers without `%`. Props can be inline, in a YAML props block, or bound with `:x`. Marks: `box`, `circle`, `underline`, `line`, `highlight`, `bracket`, `cross`, `check`. Colors: `blue` (default), `red`, `amber`, `green`, `gray`, or a 3- or 6-digit hex. Add `side="left"`, `side="right"`, or `side="top"` to put a note beside or above the image with a hand-drawn arrow, and `mark="none"` to let the arrow do the pointing. A screenshot takes a `title` above the image and an `href` to the captured page; a compare takes a `title` for screen readers. `::compare{mode="slider"}` lays the two screenshots over each other with a divider the reader drags, and lists side notes under it; side by side, a compare lists notes beside an image and keeps notes above it. A screenshot's Copy button, or Ctrl+C or ⌘C while it's focused, copies it as a PNG with its marks and notes. An image from another origin needs CORS headers for that, and an iframe needs `allow="clipboard-write"`. Side notes and labels are handwritten in Caveat, inlined with the styles; set `--ca-note-font: inherit` for the page font.

The plugin adds every problem to `meta.issues`, one sentence each naming the block and the fix, so a host can reject a document before publishing it.

The output is static HTML with one inlined `<style>` per document and `style` attributes for positions, so a strict CSP needs `style-src 'unsafe-inline'`. Notes are ordinary Markdown, so raw HTML in them renders like anywhere else in the document; for untrusted input, add Comark's `security` plugin and list the tags to drop, such as `security({ blockedTags: ["script", "style", "iframe"] })`; it cleans notes too. 

The styles follow shadcn/ui: they read its CSS variables, such as `--background` and `--border`, when the page has them, and use its neutral theme otherwise. Set `--comark-background`, `--comark-foreground`, `--comark-muted`, `--comark-border`, `--comark-accent`, `--comark-ring`, `--comark-radius`, or `--comark-font` to theme zoom, carousel, and annotate at once; the rules sit in a `comark` CSS layer, so any plain rule of your own wins. See [Theming](https://comark-ui.onmax.me/guide/theming/) for the Nuxt UI mapping. The mark colors are separate: override them with a plain rule such as `.ca { --ca-color: #0070f3; --ca-solid: #0070f3; --ca-ink: #fff }`, which sets the marks, the stamps, and the stamp numbers; see the annotations' [Theming page](https://comark-ui.onmax.me/annotate/#theme).

## Agents

The comark-ui agent skill knows the syntax, how to measure marks from the page, and how to check the result. `npx skills add onmax/comark-ui` installs it, and an app that serves skills to its own agents can bundle it from `comark-ui/skills/comark-ui/`, which always matches the renderers it installed. The CLI checks and previews documents:

```sh
npx comark-annotate check report.md other.md        # one line per problem, exit 1 if any
npx comark-annotate render report.md -o report.html # standalone page to screenshot
```

## Development

```sh
pnpm install
pnpm ready       # format, lint, typecheck, build, test, doctor
pnpm docs:build  # render docs/index.md into docs/dist
```

## Credits

comark-annotate is MIT licensed. The hand-drawn marks come from [AnnotationKit](https://annotationkit.vercel.app), and it is built on [Comark](https://comark.dev), which does the parsing and rendering. It is an independent project, not part of Comark.
