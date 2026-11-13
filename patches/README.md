# Dependency backports

The docs use a ViteHub build from pkg.pr.new, since `@vite-hub/docs` isn't on npm yet. The commit, `bc43707`, is the head of [vite-hub/vitehub#4138](https://github.com/vite-hub/vitehub/pull/4138), stacked on [#4137](https://github.com/vite-hub/vitehub/pull/4137): the Content GitHub store reads the Console overview with a few requests, caches them in KV, and signs in as the GitHub App. Move back to a `main` build once both merge. Every `@vite-hub/*` entry in the catalog and the overrides names the same commit, so a bump moves them all together.

The playground codec and renderer are from [vite-hub/vitehub#3750](https://github.com/vite-hub/vitehub/pull/3750), build `af71f9d`, because the design-system build does not export `@vite-hub/ui/playground` or `@vite-hub/ui/playground-render`. The docs install them as `@vite-hub/ui-playground`, keeping the rest of the UI on the design-system build. Its stylesheet loads before the current UI stylesheet, so the current design system wins their shared rules. Remove the alias and its stylesheet once the shared build includes both playground exports and their styles.

## PKCE in Workers

`pkce-challenge@5.0.1` needs a `workerd` export condition for Nitro 3's Cloudflare build. The patch backports [crouchcd/pkce-challenge#50](https://github.com/crouchcd/pkce-challenge/pull/50), which merged but is not released. Remove it after upgrading to a release with the export.
