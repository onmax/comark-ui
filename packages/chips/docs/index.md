---
title: Chips
description: Links and @mentions as chips with the site's favicon or the person's avatar, written in Markdown.
keywords: mention, avatar, favicon, link preview, user, GitHub user, pill, inline link, unavatar
tagline: Write a link or an @user as usual and get a chip with its favicon or avatar, downloaded while parsing so readers ask no one.
group: Review blocks
icon: at-sign
blurb: Links and @mentions as chips
credits: 'After <a href="https://antfu.me">Anthony Fu</a>''s <a href="https://github.com/antfu/markdown-it-magic-link">markdown-it-magic-link</a>. Favicons from Google, avatars from GitHub and <a href="https://unavatar.io">unavatar.io</a>.'
---

::examples
:::example{label="Links"}
```md
Moves the build from [webpack](https://webpack.js.org) to [Vite](https://vite.dev), as the [Nuxt docs](https://nuxt.com/docs) recommend.
```
:::

:::example{label="Mentions"}
```md
@posva maintains [Vue Router](https://github.com/vuejs/router), and @danielroe leads [Nuxt](https://github.com/nuxt/nuxt). [Evan](https://bsky.app/profile/evanyou.me) posts on Bluesky.
```
:::

:::example{label="Overrides"}
```md
Ask [Anthony](https://antfu.me){avatar="@antfu"}, or read the [guide](https://vite.dev/guide/){chip=false}. The pages render with :chip[Comark]{href="https://comark.dev"}.
```
:::
::

Every web link becomes a chip with its site's favicon, and every `@user` a chip with their GitHub avatar that links to their profile. A link into a GitHub account or repository shows the account's avatar, and a link into an X, Bluesky, YouTube, or GitLab account shows theirs through [unavatar.io](https://unavatar.io).

The plugin downloads the images while parsing and inlines them, so the page asks no other site for them. It keeps them on disk, so the next build asks no one either. An image it can't download, such as in a browser that blocks the request, stays a link for the reader's browser to load.

## Usage

### Links

Any link to an `http` or `https` address becomes a chip. A link's text stays as written, except that a bare URL loses its scheme and an `@user` link its `@`. These stay plain links:

- relative links, anchors, and `mailto:` links;
- a link around an image, such as a badge;
- a link written as raw HTML;
- a link with `{chip=false}`.

### Mentions

`@user` becomes a chip linking to `https://github.com/user`. It must stand on its own: `me@example.com` and `@comark/html` stay text. So does anything in a link or in code.

### Accounts

A link into an account shows the account's avatar instead of the site's favicon, and a link whose text is `@` and the handle loses its `@`:

| Link | Avatar from |
| --- | --- |
| `https://github.com/user`, or any page under it | GitHub |
| `https://x.com/user` or `https://twitter.com/user`, or any page under it | [unavatar.io](https://unavatar.io) |
| `https://bsky.app/profile/handle` | unavatar.io |
| `https://youtube.com/@handle` | unavatar.io |
| `https://gitlab.com/user` | unavatar.io |

### Props

| Prop | On | Does |
| --- | --- | --- |
| `avatar="https://…"` | a link or `:chip` | Uses this image, round like an avatar |
| `avatar="@user"` | a link or `:chip` | Uses that GitHub account's avatar |
| `avatar="provider:name"` | a link or `:chip` | Uses that account's avatar on any network [unavatar.io](https://unavatar.io/docs) knows, such as `bluesky:sindresorhus.com` |
| `chip=false` | a link | Keeps a plain link |
| `href` | `:chip` | The address, required |
| `title` | a link or `:chip` | The tooltip, as on any link |

`:chip[Text]{href="https://…"}` writes a chip directly, for text that isn't a link elsewhere in Markdown.

[Theme](#theme) covers the variables and class names that change how chips look.

## API

### Options

Options go under `chips` in `comarkUi()`, or to `chips()` when you use it alone.

```ts
chips({
  // Keep the image URLs for the reader's browser to load, instead of downloading them while parsing.
  download: false,
  // A site's image, by its host. Google's favicon service by default.
  favicon: (host) => `https://${host}/favicon.ico`,
  // An account's image, by its GitHub login. Its GitHub avatar by default.
  avatar: (login) => `https://unavatar.io/github/${login}`,
  // The folder that keeps images between builds. `false` keeps them in memory only.
  cache: ".comark/chips",
});
```

Parsing downloads each favicon and avatar and inlines it. Each image is kept in `node_modules/.cache/comark-chips` for a week, so a site that builds many pages, or builds again, asks once per image.

Pass `download: false` where parsing runs in a browser. Most sites don't let a page download their images, so each chip would try and then fall back to its URL anyway.

### Rate limits

Avatars from X, Bluesky, YouTube, GitLab, and `avatar="provider:name"` come from [unavatar.io](https://unavatar.io), which answers 25 downloads a day for each IP address without a plan. With the cache, each image counts once a week. GitHub avatars and favicons have no such limit.

When unavatar.io says no, the chip keeps the URL for the reader's browser, and `meta.issues` says to build again.

A CI that starts with no `node_modules` downloads everything every time. Set `cache` to a folder you commit, such as `.comark/chips`, and it downloads only the images that are new.

`meta.issues` reports an avatar that answers with an HTTP error, such as an `@user` with no GitHub account. A site without a favicon gets a chip with no image. Each problem has its own rule in [Doctor](/doctor/).

### Package

[comark-ui](/getting-started/) brings `comark-chips` and registers it. To use it alone, install it and pass the renderer's `components`:

```sh
pnpm add comark @comark/html comark-chips
```

```ts
import { createHtmlRenderer } from "@comark/html";
import chips, { components } from "comark-chips/html";

const render = createHtmlRenderer({ plugins: [chips()], components });
```

For Vue, React, or Svelte, import from `comark-chips/vue`, `comark-chips/react`, or `comark-chips/svelte`. The components add the styles when they mount. When you render on a server, import `comark-chips/style.css` with your own styles so the page doesn't shift. [Renderers](/guide/renderers/) covers using it with other plugins.

## Theme

### Tokens

Chips take their colors from the shared tokens in [Theming](/guide/theming/), so a site that themes the other plugins themes chips too. A favicon chip is a faint tint of `--comark-foreground` with a hairline ring of it, so it reads on a page, a card, or a callout without a color of its own. A focused chip draws its outline in `--comark-ring`.

### Variables

Set these on `:root`, or on any ancestor to change the chips inside it only:

| Variable | Default | Used for |
| --- | --- | --- |
| `--cp-background` | `--comark-foreground` at 3.5% | A favicon chip's fill |
| `--cp-hover` | `--comark-foreground` at 7% | A favicon chip's fill under the pointer |
| `--cp-ring` | `--comark-foreground` at 8% | The hairline around a favicon chip |
| `--cp-color` | The text's color | The chip's text |
| `--cp-font-weight` | `500` | The chip's text |
| `--cp-radius` | `0.375em` | A favicon chip's corners |
| `--cp-image-size` | `1em` | The favicon or avatar |

```css
:root {
  --cp-background: oklch(0.95 0.03 250);
  --cp-ring: transparent;
  --cp-radius: 999px;
}
```

### Class names

A chip is an `a.cp` with `data-kind="favicon"` or `data-kind="avatar"`, holding an `img.cp-img` and its text. A favicon chip sits in a faint pill with its favicon, square with rounded corners. An avatar chip, such as a mention, is only its round avatar and the name, with no pill, and underlines under the pointer. Target these for anything the variables don't cover:

```css
.cp[data-kind="avatar"] .cp-img {
  outline: 2px solid var(--comark-background);
}
```

The rules sit in a `comark` CSS layer, so a plain rule of your own wins without `!important`.
