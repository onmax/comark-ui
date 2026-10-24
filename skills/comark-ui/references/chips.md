# Links and mentions as chips

comark-chips turns every web link and every `@user` into a chip with the site's favicon or the account's avatar. It downloads each image while parsing and inlines it, so readers' browsers ask no other site. Write links and mentions as usual; the props below change one chip.

## Syntax

```md
Moves the build from [webpack](https://webpack.js.org) to [Vite](https://vite.dev), reviewed by @posva. Ask [Anthony](https://antfu.me){avatar="@antfu"} about the plugin, or read the [migration guide](https://vite.dev/guide/migration){chip=false}. The docs render with :chip[Comark]{href="https://comark.dev"}.
```

- Every `http` or `https` link becomes a chip with the site's favicon, and a bare URL loses its scheme. Relative links, anchors, `mailto:` links, a link around an image such as a badge, and a link in raw HTML stay plain.
- `@user` becomes a chip that links to `https://github.com/user`, with the GitHub avatar. It must stand alone: `me@example.com`, an npm scope such as `@comark/html`, and anything in a link or in code stay text.
- A link into an account shows the account's avatar, and link text written as `@handle` loses its `@`. That covers `github.com/user` and `x.com/user` (or `twitter.com/user`) with any page under them, `bsky.app/profile/handle`, `youtube.com/@handle`, and `gitlab.com/user`.
- `:chip[Text]{href="https://…"}` writes a chip for text that isn't a link. `href` is required and must be a web address.

| Prop | On | What it does |
| --- | --- | --- |
| `chip=false` | a link | Keeps a plain link. |
| `avatar="@user"` | a link or `:chip` | Shows that GitHub account's avatar. |
| `avatar="provider:name"` | a link or `:chip` | Shows the account's avatar on any network unavatar.io knows, such as `bluesky:sindresorhus.com`. |
| `avatar="https://…"` | a link or `:chip` | Shows this image, round like an avatar. |
| `title` | a link or `:chip` | Sets the tooltip. |

## Mentions

Copy each `@user` from the person's GitHub profile, since a mention always means a GitHub login. The linter downloads nothing, so it can't tell whether a login exists; a build that downloads reports one with no avatar. For someone on another network, link their profile, or set `avatar="provider:name"`.

## Register

- In `comark-ui`: on, with the options below under `chips`. Pass `chips: { download: false }` when parsing in a browser, which may not download another site's images.
- Alone: `pnpm add comark @comark/html comark-chips`, then `createHtmlRenderer({ plugins: [chips()], components })` with both from `comark-chips/html`. `comark-chips/vue`, `/react`, and `/svelte` render it too.

`download` (default `true`) inlines each image; `false` leaves its URL for the reader's browser. `favicon(host)` and `avatar(login)` return an image URL in place of Google's favicon service and the GitHub avatar. `cache` is the folder that keeps images for a week, `node_modules/.cache/comark-chips` by default, and `false` keeps them in memory. Avatars from X, Bluesky, YouTube, GitLab, and `provider:name` come through unavatar.io, which allows 25 downloads a day per IP address. In CI, set `cache` to a folder you commit, such as `.comark/chips`, so a build downloads only new images.
