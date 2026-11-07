# Dependency backports

The docs use [vite-hub/vitehub#3544](https://github.com/vite-hub/vitehub/pull/3544) from pkg.pr.new for Nuxt 5 and Nitro 3 support, since `@vite-hub/docs` isn't on npm yet. Every `@vite-hub/*` entry in the catalog names the same commit, so a bump moves them all together.

## One-page sections in the docs sidebar

`@vite-hub/docs@0.0.0-preview-298ec15` is patched with [vite-hub/vitehub#3559](https://github.com/vite-hub/vitehub/pull/3559). Every package page is a section with one page, and the sidebar listed only that page, so `/diff` showed a single "Diff" link. With the patch, a one-page section's sidebar lists the sections of its category. The patch was generated with `pnpm patch` and `pnpm patch-commit` against the built `dist/`. Remove `patches/@vite-hub__docs@0.0.0-preview-298ec15.patch` and its `patchedDependencies` entry when the catalog moves to a vitehub commit that contains the PR.

## PKCE in Workers

`pkce-challenge@5.0.1` needs a `workerd` export condition for Nitro 3's Cloudflare build. The patch backports [crouchcd/pkce-challenge#50](https://github.com/crouchcd/pkce-challenge/pull/50), which merged but is not released. Remove it after upgrading to a release with the export.
