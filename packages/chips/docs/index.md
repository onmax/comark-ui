---
title: Chips
description: Links and @mentions as chips with the site's favicon or the person's avatar, written in Markdown.
keywords: mention, avatar, favicon, link preview, user, GitHub user, pill, inline link, unavatar
tagline: A link or an @user drawn as a chip with its site's favicon or the person's avatar.
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

## Features

- Every web link becomes a chip with its site's favicon.
- Every `@user` becomes a chip with their GitHub avatar that links to their profile.
- A link into a GitHub, X, Bluesky, YouTube, or GitLab account shows the account's avatar.
- Images download while parsing and go inline, so the page asks no other site for them.
- Images stay on disk, so the next build asks no one either.
- An image it can't download, such as in a browser that blocks the request, keeps its URL for the reader's browser to load.

## Usage

Write a link as usual. Any link to an `http` or `https` address becomes a chip.

::example
```md
Read the [Vite guide](https://vite.dev/guide/).
```
::

A link's text stays as written. A bare URL loses its scheme.

### Mentions

Write `@user` to link a GitHub account, with its avatar. The chip links to `https://github.com/user`.

::example
```md
@posva maintains Vue Router.
```
::

> [!NOTE]
> A mention must stand on its own: `me@example.com` and `@comark/html` stay text. So does anything in a link or in code.

### Accounts

Link into an account to show the account's avatar instead of the site's favicon. A link whose text is `@` and the handle loses its `@`.

::example
```md
Ask [@danielroe](https://github.com/danielroe) about [Nuxt](https://github.com/nuxt/nuxt).
```
::

| Link | Avatar from |
| --- | --- |
| `https://github.com/user`, or any page under it | GitHub |
| `https://x.com/user` or `https://twitter.com/user`, or any page under it | [unavatar.io](https://unavatar.io) |
| `https://bsky.app/profile/handle` | unavatar.io |
| `https://youtube.com/@handle` | unavatar.io |
| `https://gitlab.com/user` | unavatar.io |

### Avatar

Use the `avatar` prop to set the chip's image. It shows round, like an avatar. It takes an image URL, `@user` for a GitHub account, or `provider:name` for an account on any network [unavatar.io](https://unavatar.io/docs) knows, such as `bluesky:sindresorhus.com`.

::example
```md
Ask [Anthony](https://antfu.me){avatar="@antfu"} before you change the link rules.
```
::

### Plain link

Use the `chip` prop with `false` to keep a plain link.

::example
```md
Read the [guide](https://vite.dev/guide/){chip=false}.
```
::

These stay plain links too:

- relative links, anchors, and `mailto:` links;
- a link around an image, such as a badge;
- a link written as raw HTML.

### Chip without a link

Use `:chip` to write a chip for text that isn't a link elsewhere in Markdown. It takes the same props, and its `href` is required.

::example
```md
The pages render with :chip[Comark]{href="https://comark.dev"}.
```
::

### Tooltip

Use the `title` prop to set the chip's tooltip, as on any link.

```md
[Vite](https://vite.dev){title="The build tool this site uses"}
```

## Examples

### Cache images in CI

A CI that starts with no `node_modules` downloads every image on every build. Set `cache` to a folder you commit, such as `.comark/chips`, and it downloads only the images that are new.

```ts
chips({ cache: ".comark/chips" });
```

### Parse in a browser

Pass `download: false` where parsing runs in a browser. Most sites don't let a page download their images, so each chip would try and then fall back to its URL anyway.

```ts
chips({ download: false });
```

### Stay under unavatar.io's limit

Avatars from X, Bluesky, YouTube, GitLab, and `avatar="provider:name"` come from [unavatar.io](https://unavatar.io). It answers 25 downloads a day for each IP address without a plan. With the cache, each image counts once a week. GitHub avatars and favicons have no such limit.

When unavatar.io says no, the chip keeps the URL for the reader's browser, and `meta.issues` says to build again.

### Your own image services

Use the `favicon` and `avatar` options to load images from other services.

```ts
chips({
  favicon: (host) => `https://${host}/favicon.ico`,
  avatar: (login) => `https://unavatar.io/github/${login}`,
});
```

## API

### Props

| Prop | Default | Description |
| --- | --- | --- |
| `href` | — | The chip's address, on `:chip`. Required, and a web address. |
| `avatar` | — | The chip's image, round like an avatar, on a link or `:chip`: an image URL, `@user` for a GitHub account, or `provider:name` for any network unavatar.io knows. |
| `chip` | `true` | `false` keeps a link plain. |
| `title` | — | The tooltip, as on any link. |

### Options

Options go under `chips` in `comarkUi()`, or to `chips()` when you use it alone.

| Option | Default | Description |
| --- | --- | --- |
| `download` | `true` | `false` keeps the image URLs for the reader's browser to load, instead of downloading them while parsing. |
| `favicon` | Google's favicon service | A function from a site's host to its image URL. |
| `avatar` | The GitHub avatar | A function from a GitHub login to its image URL. |
| `cache` | `"node_modules/.cache/comark-chips"` | The folder that keeps images between builds, for a week each. `false` keeps them in memory only. |

### Issues

The plugin adds every problem to `meta.issues`, as [Validation](/guide/validation/) describes:

- An avatar that answers with an HTTP error, such as an `@user` with no GitHub account.
- A download the site turns away for now (HTTP 429). The chip keeps the URL, and the issue says to build again.
- An `avatar` that is a bare login, such as `avatar="antfu"`. Write `avatar="@antfu"`.
- A `:chip` whose `href` isn't a web address.

A site without a favicon gets a chip with no image, and no issue. Each problem has its own rule in [Doctor](/doctor/).

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

Chips take their colors from the shared tokens in [Theming](/guide/theming/), so a site that themes the other plugins themes chips too. The rules sit in a `comark` CSS layer, so a plain rule of your own wins without `!important`.

### Shared tokens

| Token | Used for |
| --- | --- |
| `--comark-foreground` | A favicon chip's faint fill and its hairline ring, so it reads on a page, a card, or a callout without a color of its own |
| `--comark-ring` | The focus outline |

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

### Classes and attributes

| Selector | Is |
| --- | --- |
| `a.cp` | A chip |
| `.cp[data-kind="favicon"]` | A favicon chip: a faint pill with its favicon, square with rounded corners |
| `.cp[data-kind="avatar"]` | An avatar chip, such as a mention: only its round avatar and the name, with no pill, underlined under the pointer |
| `.cp-img` | The favicon or avatar |

### Example

A tinted, round pill with no ring, and a ring around avatars:

```css
:root {
  --cp-background: oklch(0.95 0.03 250);
  --cp-ring: transparent;
  --cp-radius: 999px;
}

.cp[data-kind="avatar"] .cp-img {
  outline: 2px solid var(--comark-background);
}
```
