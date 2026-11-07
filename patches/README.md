# Dependency backports

The docs use [vite-hub/vitehub#3544](https://github.com/vite-hub/vitehub/pull/3544) from pkg.pr.new for Nuxt 5 and Nitro 3 support, since `@vite-hub/docs` isn't on npm yet. Every `@vite-hub/*` entry in the catalog names the same commit, so a bump moves them all together.

## PKCE in Workers

`pkce-challenge@5.0.1` needs a `workerd` export condition for Nitro 3's Cloudflare build. The patch backports [crouchcd/pkce-challenge#50](https://github.com/crouchcd/pkce-challenge/pull/50), which merged but is not released. Remove it after upgrading to a release with the export.
