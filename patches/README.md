# Dependency backports

The docs use a commit-pinned ViteHub preview from pkg.pr.new, since `@vite-hub/docs` isn't on npm yet. Every `@vite-hub/*` entry in the catalog names the same commit, so a bump moves them all together.

## Comark syntax highlighting

`comark@0.8.1` is patched with [comarkdown/comark#523](https://github.com/comarkdown/comark/pull/523). It removes exponential backtracking from the component attribute grammar, so Markdown samples followed by punctuation cannot stall docs generation. The patch was generated with `pnpm patch` and `pnpm patch-commit`. The fix merged on 2026-10-28 but is not in a release yet (0.8.1 is the latest). Remove `patches/comark.patch` and its `patchedDependencies` entry after upgrading to a Comark release containing it.
