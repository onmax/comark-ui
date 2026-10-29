# Dependency backports

The docs use ViteHub preview `2862ffe428dde04c5d64d76b7b26e5224a170e17`. It includes the Console app Auth sign-in and the Nuxt, Cloudflare, Content route, optional dependency, and Workspace cache fixes, so the ViteHub integration patches have been removed. Keep every ViteHub package on the same preview build.

## Comark syntax highlighting

`comark@0.8.1` is patched with [comarkdown/comark#523](https://github.com/comarkdown/comark/pull/523). It removes exponential backtracking from the component attribute grammar, so Markdown samples followed by punctuation cannot stall docs generation. The patch was generated with `pnpm patch` and `pnpm patch-commit`. Remove `patches/comark.patch` and its `patchedDependencies` entry after upgrading to a Comark release containing that fix.
