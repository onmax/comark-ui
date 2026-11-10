# Dependency backports

The docs use a ViteHub build from pkg.pr.new, since `@vite-hub/docs` isn't on npm yet. The commit, `4cd1f4cd`, is on the [`integration/design-system-comark`](https://github.com/vite-hub/vitehub/tree/integration/design-system-comark) branch: [vite-hub/vitehub#3780](https://github.com/vite-hub/vitehub/pull/3780) (one design system for the Console and the docs) on `main`, plus the three hosted Console PRs that are still open: [#3540](https://github.com/vite-hub/vitehub/pull/3540) (OAuth Console tokens on the Console data routes), [#3548](https://github.com/vite-hub/vitehub/pull/3548) (`console.embed`) and [#3733](https://github.com/vite-hub/vitehub/pull/3733) (start link pages in the docs shell). The rest of the hosted Console stack is on `main`. Every `@vite-hub/*` entry in the catalog names the same commit, so a bump moves them all together. Move to a `main` commit once those PRs merge.

The playground codec and renderer are from [vite-hub/vitehub#3750](https://github.com/vite-hub/vitehub/pull/3750), build `af71f9d`, because the design-system build does not export `@vite-hub/ui/playground` or `@vite-hub/ui/playground-render`. The docs install them as `@vite-hub/ui-playground`, keeping the rest of the UI on the design-system build. Its stylesheet loads before the current UI stylesheet, so the current design system wins their shared rules. Remove the alias and its stylesheet once the shared build includes both playground exports and their styles.

## PKCE in Workers

`pkce-challenge@5.0.1` needs a `workerd` export condition for Nitro 3's Cloudflare build. The patch backports [crouchcd/pkce-challenge#50](https://github.com/crouchcd/pkce-challenge/pull/50), which merged but is not released. Remove it after upgrading to a release with the export.
