---
title: Bundle
description: A bundle size report in Markdown, read from two builds.
keywords: bundle size, bundle analyzer, gzip, brotli, vite, rolldown, nuxt, sonda, treemap, performance, pull request
tagline: What every page loads before and after a change, read from two builds, with the packages that moved.
group: Review blocks
icon: package
blurb: Bundle size before and after
credits: 'Framed like <a href="https://ui.shadcn.com/charts">shadcn/ui''s chart cards</a>: one number, the picture, and a footer that says it in words.'
---

::examples
:::example{label="Two builds"}
```md
::bundle{before="reports/main.json" after="reports/pr.json" title="Upgrade the dashboard to ECharts 5.5"}
::
```
:::

:::example{label="One build"}
```md
::bundle{src="reports/pr.json" title="What the dashboard loads"}
::
```
:::
::

## Features

- Reads the builds itself: a build folder, measured with gzip -9 and brotli 11, or a [Sonda](https://sonda.dev) JSON report. Nothing to paste or keep in sync.
- Splits what every page loads from what loads later: the entry, its static imports, and Nuxt's default layout, against routes and `import()`.
- Draws the bars in neutrals and marks only what changed: what the new build added to every page is dark, and what it dropped is hatched, with the package's name under it.
- Says the change in one sentence for screen readers, so the number and the reason read without the picture.
- Keeps a treemap of the new build behind a native `<details>`, with a removed package at its old size. No script.

## Usage

Point `before` and `after` at two builds of the same app. Paths are read from the document's folder, or from the root when they start with `/`.

::example
```md
::bundle{before="reports/main.json" after="reports/pr.json"}
::
```
::

A path that ends in `.json` is read as a Sonda report. Any other path is a build folder, such as `dist/assets` for Vite or `.output/public/_nuxt` for Nuxt, which the block measures while it parses.

> [!NOTE]
> A build folder needs sourcemaps to show packages, such as Vite's `build.sourcemap: "hidden"`. Without them the block shows chunks.

### Title

Use the `title` prop to name the report in its header. It also names the figure for screen readers. Without it, the header reads "Bundle size".

::example
```md
::bundle{before="reports/main.json" after="reports/pr.json" title="Upgrade the dashboard to ECharts 5.5"}
::
```
::

### One build

Use the `src` prop instead of `before` and `after` to show one build without a comparison: what every page loads, and the treemap of what the build holds.

::example
```md
::bundle{src="reports/pr.json"}
::
```
::

## Examples

### Evidence for a performance pull request

Keep the base branch's build next to the new one, then put the block in the pull request's evidence, as [Before and after evidence](/skills/before-after-evidence) describes.

```sh
git worktree add ../main origin/main
(cd ../main && pnpm install && pnpm build)
cp -r ../main/dist/assets .bundle/main
pnpm build
```

```md
::bundle{before=".bundle/main" after="dist/assets" title="Replace Moment with Temporal"}
::
```

### A Nuxt app

Point the block at `.output/public/_nuxt` after `nuxi build`. Nuxt loads the default layout with `import()`, but every page that uses it waits for it, so the block counts the layout and its imports toward every page and says so in the footer.

## API

### Props

| Prop | Default | Description |
| --- | --- | --- |
| `before` | — | The build to compare from: a build folder, or a Sonda `.json` report. |
| `after` | — | The build to compare to, in the same forms as `before`. |
| `src` | — | One build to show without a comparison, in place of `before` and `after`. |
| `title` | `"Bundle size"` | Shown in the header, and names the figure for screen readers. |

### Options

Pass options under `bundle` in `comarkUi()`, or to `bundle()` alone. In `comarkUi()`, a `::bundle` block reads no builds until you pass options, such as `comarkUi({ bundle: { root: "." } })`.

| Option | Default | Description |
| --- | --- | --- |
| `root` | `"."` | The folder a path can't leave, as in [comark-include](/include). |
| `base` | `""` | The document's folder under `root`, where relative paths start. |
| `read` | Reads from disk | Takes a path under the root and returns the file's text. Pass one in a browser or an edge runtime, with Sonda reports. |
| `list` | Lists from disk | Takes a folder under the root and returns its files. Measuring a build folder also needs Node's zlib. |

### What it reads

- **A build folder**: every `.js` and `.mjs` file under it, with its gzip -9 and brotli 11 size, its `import` and `import()` of other chunks, and its sourcemap's sources, which name the packages. The entries come from Vite's `.vite/manifest.json`, else the `<script type="module">` tags of `index.html`, else the chunks nothing imports. Both are looked for in the folder and its parent.
- **A Sonda report** (`format: "json"`, `gzip: true`): its assets, each module's share of each asset, and the import graph between modules. The entries are the entry points no other asset imports.

Every page is the entries and their static imports, plus Nuxt's default layout and its imports when the build has one. Everything else loads later. A package's size in a folder build is its share of its chunks' characters, applied to the chunks' gzip and brotli sizes. Sizes are in kB of 1,000 bytes, as the build tools print them.

### Issues

The plugin adds these problems to `meta.issues`, as [Validation](/guide/validation) describes:

- A block with no build, or with only one of `before` and `after`.
- A block with `src` and `before` or `after` together.
- A path that is a URL, leaves the root, or doesn't exist.
- A file that is neither a build folder with JavaScript nor a Sonda report with gzip sizes.
- Text inside the block. The block drops it.
- A prop it doesn't read. It's ignored.

Each issue names the block and the fix, and has its own rule in [Doctor](/doctor):

```txt
`::bundle` 1: it has `after` but no `before`. Give both builds, or use `src` for one.
`::bundle` 2: "dist/asets" doesn't exist. It resolved to "dist/asets" under the root; check the path or `base`.
```

### Package

comark-ui installs and registers `comark-bundle`. To use it alone, install it with Comark and a renderer:

```sh
pnpm add comark @comark/html comark-bundle
```

Register the plugin with the folder it may read, and pass the renderer's `components`:

```ts
import { createHtmlRenderer } from "@comark/html";
import bundle, { components } from "comark-bundle/html";

const render = createHtmlRenderer({ plugins: [bundle({ root: "." })], components });
```

For Vue, React, or Svelte, import from `comark-bundle/vue`, `comark-bundle/react`, or `comark-bundle/svelte`. The components add the styles on mount. Import `comark-bundle/style.css` with your styles so a server-rendered page doesn't shift. [Renderers](/guide/renderers) covers using it with other plugins.

## Theme

The report sits in a bordered card with a quiet header, like [Diff](/diff). The badge is red when every page grew and green when it shrank, from the status colors; the bars and the treemap are neutral. The rules sit in a `comark` CSS layer, so any plain rule of yours wins.

### Shared tokens

The report reads these [shared tokens](/guide/theming):

| Token | Used for |
| --- | --- |
| `--comark-background` | The card |
| `--comark-foreground` | The number, mixed into the bars, the tiles, and the labels |
| `--comark-muted` | Labels, the muted footer line, and the icon |
| `--comark-border` | The card's edge, the header, and the disclosure |
| `--comark-accent` | The header, and a hovered disclosure |
| `--comark-success` | The badge of a smaller total |
| `--comark-danger` | The badge of a bigger total |
| `--comark-ring` | The disclosure's focus ring |
| `--comark-radius` | The card's corners |
| `--comark-font` | The text |

### Variables

Set them on `.cbr`:

| Variable | Default | Used for |
| --- | --- | --- |
| `--cbr-better`, `--cbr-worse` | Success and danger, mixed toward the text | The badge's text |
| `--cbr-rest` | The text at 16% | The part of each bar that didn't change |
| `--cbr-ink` | The text at 78% | What the new build added, in a bar and in the treemap |
| `--cbr-text` | The text at 72% | The labels and the names under the bars |
| `--cbr-tile` | The text at 6% | A package's tile |

### Classes

| Class | Element |
| --- | --- |
| `.cbr` | The card, a `<figure>` |
| `.cbr-head`, `.cbr-title` | The header and its title |
| `.cbr-big`, `.cbr-pill` | The number and its badge; `[data-verdict]` is `better`, `worse`, or `same` |
| `.cbr-bar`, `.cbr-seg` | A build's bar and its parts; `[data-kind]` is `rest`, `removed`, `moved-out`, `added`, or `moved-in` |
| `.cbr-foot-1`, `.cbr-foot-2` | The change in words, for screen readers, and the footer's muted line |
| `.cbr-more` | The disclosure, a `<details>` |
| `.cbr-tile` | A treemap tile; `[data-kind]` as on `.cbr-seg`, plus `changed` and `same` |

```css
.cbr {
  --cbr-ink: oklch(0.55 0.15 260);
}
```
