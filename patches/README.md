# Dependency backports

The docs use ViteHub preview `2862ffe428dde04c5d64d76b7b26e5224a170e17`. It includes the Console app Auth sign-in and the Nuxt, Cloudflare, Content route, optional dependency, and Workspace cache fixes, so the earlier integration patches have been removed. Keep every ViteHub package on the same preview build.

The Console also imports the unused Teams connector and its optional KV drivers. `nitro.virtual` disables that import for this site, which has no KV store, and throws if it is used. Remove this override once the Console no longer includes that unused connector.

## Comark syntax highlighting

`comark@0.8.1` is patched with [comarkdown/comark#523](https://github.com/comarkdown/comark/pull/523). It removes exponential backtracking from the component attribute grammar, so Markdown samples followed by punctuation cannot stall docs generation. The patch was generated with `pnpm patch` and `pnpm patch-commit`. Remove `patches/comark.patch` and its `patchedDependencies` entry after upgrading to a Comark release containing that fix.

## Cloudflare Node compatibility

`docs/modules/wrangler-output.ts` removes ViteHub's redundant `nodejs_compat_v2` flag and Nitro 2's `no_nodejs_compat_v2` opt-out from the generated Wrangler config. The root config's `nodejs_compat` flag and modern compatibility date select the required Node APIs. Nitro still builds with Node compatibility enabled. Remove this normalization when ViteHub and Nitro generate the correct flags themselves. CI checks the final flags and runs `wrangler deploy --dry-run`.
