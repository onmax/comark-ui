# ViteHub backports

These pnpm patches keep the docs integration fixes available before their upstream PRs merge.

| Package | Upstream fix |
| --- | --- |
| `vite-hub@0.0.4` | [#3006](https://github.com/vite-hub/vitehub/pull/3006) resolves generated Nitro plugins and keeps framework H3 imports together. [#3009](https://github.com/vite-hub/vitehub/pull/3009) preserves Cloudflare Node compatibility and passes the generated Env alias to Wrangler. [#3010](https://github.com/vite-hub/vitehub/pull/3010) respects each package's optional dependency metadata. |
| `@vite-hub/content@0.0.4` | [#3007](https://github.com/vite-hub/vitehub/pull/3007) supports `defineContent({ route: false })` while retaining server reads and Console editing. |
| `@vite-hub/source@0.0.4` | [#3007](https://github.com/vite-hub/vitehub/pull/3007) omits the disabled public API route and removes stale output. |

The integration patches were generated with `pnpm patch` and `pnpm patch-commit` against preview `3726291`. Preview builds use hashed distribution filenames. Refresh these patches when changing that pin, then run Nuxt preparation and the docs build. Remove each patch and its `patchedDependencies` entry once the preview contains the corresponding upstream fix.

The older Workspace cache patch is managed separately by the preview upgrade.
