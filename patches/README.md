# Dependency backports

The docs use vite-hub/vitehub `main` from pkg.pr.new, since `@vite-hub/docs` isn't on npm yet. Every `@vite-hub/*` entry in the catalog names the same commit, so a bump moves them all together.

## Comark syntax highlighting

`comark@0.8.1` is patched with [comarkdown/comark#523](https://github.com/comarkdown/comark/pull/523). It removes exponential backtracking from the component attribute grammar, so Markdown samples followed by punctuation cannot stall docs generation. The patch was generated with `pnpm patch` and `pnpm patch-commit`. The fix merged on 2026-10-28 but is not in a release yet (0.8.1 is the latest). Remove `patches/comark.patch` and its `patchedDependencies` entry after upgrading to a Comark release containing it.

## @vite-hub/docs and @vite-hub/web-container

Both are patched with [vite-hub/vitehub#3372](https://github.com/vite-hub/vitehub/pull/3372), built from its branch and committed with `pnpm patch-commit`.

- `@vite-hub/docs` gets Nuxt SEO: a share image for every page, rendered while the build prerenders, plus site config and Schema.org. The patch adds dependencies that pnpm resolves before it applies the patch, so they come from the `packageExtensions` entry for `@vite-hub/docs` and the `@vite-hub/docs>nuxt-agent-discovery` override.
- `@vite-hub/web-container` stops importing `@webcontainer/env`, so the Worker bundles without an alias for `@blitz/internal/env`.

Once the PR merges, move the catalog to a vitehub commit that contains it. Then remove both patches, their `patchedDependencies` entries, the `packageExtensions` entry, and the override.
