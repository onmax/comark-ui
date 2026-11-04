# Dependency backports

The docs use the released `vite-hub@0.1.0`. Its packages share one version, so a bump moves `vite-hub` in the catalog and `@vite-hub/source` in `docs/package.json` together.

## Comark syntax highlighting

`comark@0.8.1` is patched with [comarkdown/comark#523](https://github.com/comarkdown/comark/pull/523). It removes exponential backtracking from the component attribute grammar, so Markdown samples followed by punctuation cannot stall docs generation. The patch was generated with `pnpm patch` and `pnpm patch-commit`. The fix merged on 2026-10-28 but is not in a release yet (0.8.1 is the latest). Remove `patches/comark.patch` and its `patchedDependencies` entry after upgrading to a Comark release containing it.

## @vite-hub/docs preview build

`docs-next/` is a spike that renders package pages through `@vite-hub/docs`, which is not on npm yet. It comes from pkg.pr.new at vite-hub/vitehub@7aeda8ac0, and `patches/@vite-hub__docs@0.0.0-preview-7aeda8a.patch` backports two fixes to that build:

- A `parser` option, so the page route and search parse with the site's Comark plugins. Without it, no comark-ui plugin runs and every block renders as an unknown component. Upstream: VITEHUB_PR_PARSER.
- `DocsAssistantOff.vue` as a render function. Its comment-only template rendered nothing on the server in production, so every page logged a hydration mismatch. Upstream: VITEHUB_PR_HYDRATION.

The patch edits `dist/`, so it was written by hand in a `pnpm patch` folder and committed with `pnpm patch-commit`. Remove it and its `patchedDependencies` entry when `docs-next/` moves to a `@vite-hub/docs` build that contains both PRs; the patch is tied to the preview version, so bumping the pkg.pr.new commit already forces that.
