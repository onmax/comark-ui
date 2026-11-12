# Dependency backports

The docs use a ViteHub build from pkg.pr.new, since `@vite-hub/docs` isn't on npm yet. The commit, `869db474`, is on `main` of vite-hub/vitehub, after the Console moved out of apps ([#4069](https://github.com/vite-hub/vitehub/pull/4069), [#4073](https://github.com/vite-hub/vitehub/pull/4073)). Every `@vite-hub/*` entry in the catalog and the overrides names the same commit, so a bump moves them all together.

The playground codec is still from [vite-hub/vitehub#3744](https://github.com/vite-hub/vitehub/pull/3744), build `0fe50ee`, because the design-system build does not export `@vite-hub/ui/playground`. The docs install it as `@vite-hub/ui-playground`, keeping the rest of the UI on the design-system build. Remove the alias and use `@vite-hub/ui/playground` once the shared build includes the codec.

## PKCE in Workers

`pkce-challenge@5.0.1` needs a `workerd` export condition for Nitro 3's Cloudflare build. The patch backports [crouchcd/pkce-challenge#50](https://github.com/crouchcd/pkce-challenge/pull/50), which merged but is not released. Remove it after upgrading to a release with the export.
