# Bundle size

comark-bundle shows what changed between two builds of an app: what every page loads before and after, and a bar per build where the packages the new build added are dark and the ones it dropped are hatched. A treemap of what the new build holds waits behind a disclosure. Use it for a performance pull request or a dependency upgrade, instead of pasting the build log or a screenshot of an analyzer.

## Syntax

Point `before` and `after` at two builds of the same app. The block reads them while the document parses, so there is nothing to paste.

```md
::bundle{before=".bundle/main" after="dist/assets" title="Replace Moment with Temporal"}
::
```

| Prop | What it does |
| --- | --- |
| `before`, `after` | The two builds' output folders, such as `dist/assets` or `.output/public/_nuxt`. |
| `src` | One build without a comparison, in place of `before` and `after`. |
| `title` | The header. It also names the figure for screen readers. Default "Bundle size". |

## Get the two builds

Build the base branch in a second worktree and keep its output, then build your branch:

```sh
git worktree add ../main origin/main
(cd ../main && pnpm install && pnpm build)
cp -r ../main/dist/assets .bundle/main
pnpm build
```

- Build with sourcemaps (`build.sourcemap: "hidden"` in Vite) so the block can name packages. Without them it shows chunks.
- Every page is the entry, its static imports, and Nuxt's default layout. Routes and `import()` count as lazy.
- Sizes are gzip -9 in kB of 1,000 bytes; raw and brotli are in the number's tooltip. Don't quote a number the block didn't print.
- Write the explanation outside the block; text inside is dropped.
- The block reads the builds while the document parses, in Node: render the document where the builds are. A Drop page or a PR body has no disk.
- Keep the `index.html` or `.vite/manifest.json` Vite writes next to `assets`; the block finds the entry chunk without them, and says so when it can't.

## Register

- In `comark-ui`: on, under the key `bundle`, but it reads no builds until you pass `{ root }` (or `{ read, list }`).
- Alone: `pnpm add comark @comark/html comark-bundle`, then `createHtmlRenderer({ plugins: [bundle({ root: "." })], components })` with both from `comark-bundle/html`. Measuring needs Node. `comark-bundle/vue`, `/react`, and `/svelte` render it too.
