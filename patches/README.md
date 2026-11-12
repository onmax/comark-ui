# Dependency backports

The docs use a ViteHub build from pkg.pr.new, since `@vite-hub/docs` isn't on npm yet. The commit, `869db474`, is on `main` of vite-hub/vitehub, after the Console moved out of apps ([#4069](https://github.com/vite-hub/vitehub/pull/4069), [#4073](https://github.com/vite-hub/vitehub/pull/4073)). Every `@vite-hub/*` entry in the catalog and the overrides names the same commit, so a bump moves them all together.

## PKCE in Workers

`pkce-challenge@5.0.1` needs a `workerd` export condition for Nitro 3's Cloudflare build. The patch backports [crouchcd/pkce-challenge#50](https://github.com/crouchcd/pkce-challenge/pull/50), which merged but is not released. Remove it after upgrading to a release with the export.
