# Dependency backports

The docs use a ViteHub build from pkg.pr.new, since `@vite-hub/docs` isn't on npm yet. The commit, `2707919d`, is on the [`integration/hosted-console`](https://github.com/vite-hub/vitehub/tree/integration/hosted-console) branch: `main` plus [#3544](https://github.com/vite-hub/vitehub/pull/3544) (Nuxt 5 and Nitro 3 docs sites) and the hosted Console stack, which lets console.vitehub.dev sign in to this site with OAuth: [#3515](https://github.com/vite-hub/vitehub/pull/3515), [#3540](https://github.com/vite-hub/vitehub/pull/3540), [#3525](https://github.com/vite-hub/vitehub/pull/3525), [#3536](https://github.com/vite-hub/vitehub/pull/3536), [#3547](https://github.com/vite-hub/vitehub/pull/3547), [#3550](https://github.com/vite-hub/vitehub/pull/3550), [#3551](https://github.com/vite-hub/vitehub/pull/3551) and [#3548](https://github.com/vite-hub/vitehub/pull/3548). Every `@vite-hub/*` entry in the catalog names the same commit, so a bump moves them all together. Move to a `main` commit once those PRs merge.

## Start links in @vite-hub/docs

Introduction and Installation sit outside every section, so `docs/nuxt.config.ts` lists them in `start.links`. On this build, those pages render as plain articles with no sidebar, and the header's Docs link opens the landing page, since the root is a `home` page. The patch backports [vite-hub/vitehub#3733](https://github.com/vite-hub/vitehub/pull/3733): the middleware and `DocsPage` give start link pages the docs layout, and Docs and the rail's Docs item open the first start link that is a docs page. Remove it when the catalog moves to a commit with that PR.

## PKCE in Workers

`pkce-challenge@5.0.1` needs a `workerd` export condition for Nitro 3's Cloudflare build. The patch backports [crouchcd/pkce-challenge#50](https://github.com/crouchcd/pkce-challenge/pull/50), which merged but is not released. Remove it after upgrading to a release with the export.
