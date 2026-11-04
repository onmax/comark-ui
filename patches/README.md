# Dependency backports

The docs use the released `vite-hub@0.1.0`. Its packages share one version, so a bump moves `vite-hub` in the catalog and `@vite-hub/source` in `docs/package.json` together.

## Comark syntax highlighting

`comark@0.8.1` is patched with [comarkdown/comark#523](https://github.com/comarkdown/comark/pull/523). It removes exponential backtracking from the component attribute grammar, so Markdown samples followed by punctuation cannot stall docs generation. The patch was generated with `pnpm patch` and `pnpm patch-commit`. The fix merged on 2026-10-28 but is not in a release yet (0.8.1 is the latest). Remove `patches/comark.patch` and its `patchedDependencies` entry after upgrading to a Comark release containing it.
