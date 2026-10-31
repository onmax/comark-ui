---
title: Embed
description: Videos, audio, and live code from a link, written in Markdown.
keywords: YouTube, Vimeo, Loom, Spotify, CodePen, StackBlitz, Figma, video, iframe, player, oEmbed, live code
tagline: A player for a video, audio, or live code link, or a card for any other link, read from the link alone.
group: Review blocks
icon: tv-minimal-play
blurb: Videos, audio, and live code
---

::examples
:::example{label="Video"}
```md
::embed{url="https://www.youtube.com/watch?v=KCrXgy8qtjM" title="Watch before standup: Vite in 100 Seconds"}
::
```
:::

:::example{label="Live code"}
```md
::embed{url="https://stackblitz.com/edit/typescript?file=index.ts" title="The pigeon tracker starts from this TypeScript starter"}
::
```
:::

:::example{label="Link card"}
```md
::embed{url="https://comark.dev" title="Comark, for writing up the pigeon findings"}
::
```
:::
::

## Features

- A YouTube, Vimeo, Loom, Spotify, CodePen, StackBlitz, or Figma link becomes its player.
- Any other `https://` link becomes a card.
- The plugin never fetches, so a document renders the same offline, in tests, and at build time.
- The link stays under every player, so the page still makes sense in a feed reader or where iframes are blocked.
- In print, each player gives way to its address.

## Usage

Use `::embed` with a link in the `url` prop. Close the block with `::` on the next line.

::example
```md
::embed{url="https://youtu.be/KCrXgy8qtjM"}
::
```
::

> [!NOTE]
> The `url` must start with `https://`. The plugin drops anything inside the block.

### Title

Use the `title` prop to name the player for screen readers. It's also the text of the link under the player. Without it, the link shows the host.

::example
```md
::embed{url="https://youtu.be/KCrXgy8qtjM" title="Watch before standup: Vite in 100 Seconds"}
::
```
::

### Start time

Use the `start` prop to start a YouTube or Vimeo video some seconds in. A YouTube link's own `t=` works too.

```md
::embed{url="https://youtu.be/KCrXgy8qtjM" title="Watch before standup: Vite in 100 Seconds" start=30}
::
```

> [!NOTE]
> `start` takes whole seconds, and only YouTube and Vimeo players can seek.

### Link card

Use a link with no player to get a card with its `title` and host. Cards don't fetch the page's title yet, so give each one a `title`.

::example
```md
::embed{url="https://comark.dev" title="Comark, for writing up the pigeon findings"}
::
```
::

## Examples

### What a link becomes

| Link | Result |
| --- | --- |
| `https://stackblitz.com/edit/typescript?file=index.ts` | A StackBlitz player. Query options such as `file` stay on the player's address. |
| `https://stackblitz.com/github/remix-run/react-router/tree/main/examples/basic` | A StackBlitz player for a GitHub directory. The path stays on the player's address. |
| `https://stackblitz.com/edit/typescript/extra` | A card and an issue. An `/edit/<project>` link takes no more path. |
| `https://www.figma.com/file/<key>/Example` | A Figma player. `/file/` is the older spelling of `/design/`. |
| `https://open.spotify.com/artist/<id>` | A full Spotify player. |
| `https://example.com/docs` | A card. Add `title` so the card names the page instead of showing `example.com`. |
| `http://example.com/docs`, `javascript:...`, or a link with `user:password@` | Nothing, and an issue. |

### StackBlitz projects

Use a project that runs in the browser alone, such as the `typescript` starter, for a preview that works on most pages. It still needs one of StackBlitz's [supported embedding environments](https://developer.stackblitz.com/guides/integration/embedding).

::example
```md
::embed{url="https://stackblitz.com/edit/typescript?file=index.ts" title="The pigeon tracker starts from this TypeScript starter"}
::
```
::

A project that runs in WebContainers, such as a Node or Vite starter, needs a cross-origin-isolated page and a supported browser. Without them, its preview may fail with "Unable to run Embedded Project". StackBlitz lists the [supported browsers](https://developer.stackblitz.com/platform/webcontainers/browser-support) and the [browser configuration](https://developer.stackblitz.com/platform/webcontainers/browser-config).

## Accessibility

Each player is an iframe named by its `title`. Without one, a screen reader hears the provider's name for it, such as "YouTube video" or "Spotify track". The link under it reads as the figure's caption. Players load when they scroll near, and the keys inside a player are the provider's.

## API

### Props

| Prop | Default | Description |
| --- | --- | --- |
| `url` | — | Required. An `https://` link to a player or any page. |
| `title` | Provider label for the player; host for the link or card | Names the player for screen readers, and is the text of the link under it or the card's title. |
| `start` | — | Whole seconds into a YouTube or Vimeo video to start at. |

### Providers

The plugin checks the path as well as the host. A link to a provider's host with a path it can't read becomes a card and adds a problem, so it stays followable without pretending to be a player.

| Provider | Links it reads | Player |
| --- | --- | --- |
| YouTube | `youtube.com/watch?v=`, `youtu.be/`, `/shorts/`, `/embed/`, `/live/` | YouTube's privacy-enhanced mode, `youtube-nocookie.com`. Shorts are tall. |
| Vimeo | `vimeo.com/<number>`, unlisted links with their hash, `player.vimeo.com/video/` | With `dnt=1`, so Vimeo doesn't track the session. |
| Loom | `loom.com/share/<id>`, `/embed/<id>` | Loom's embed player. |
| Spotify | `open.spotify.com/` track, album, playlist, episode, show, and artist links | A compact player for a track or an episode, a full one for the rest. |
| CodePen | `codepen.io/<user>/pen/<id>`, also `full`, `details`, or `embed` | The pen's result. |
| StackBlitz | `stackblitz.com/edit/<project>`, `stackblitz.com/github/<owner>/<repo>[/<path>]` | The project or GitHub branch, tag, commit, or directory, keeping options such as `file` and `view`. |
| Figma | `figma.com/design`, `file`, `proto`, `board`, `slides`, and `deck` links | Figma's embed, keeping `node-id`. |

### Options

The plugin takes no options. In `comarkUi()`, `embed: false` turns it off.

### Issues

The plugin adds every problem to `meta.issues`, as [Validation](/guide/validation/) describes:

- A missing `url`.
- A `url` that isn't `https://`, or that has a user name or password before the host. The block renders nothing.
- A provider's link it can't read an ID from. The block renders as a card.
- A card without a `title`.
- A `start` that isn't whole seconds, or that is set on a player that can't seek.
- Content inside the block.
- A prop `::embed` doesn't read.

Each has its own rule in [Doctor](/doctor/).

### Package

[comark-ui](/getting-started/) brings `comark-embed` and registers it. To use it alone, install it and pass the renderer's `components`:

```sh
pnpm add comark @comark/html comark-embed
```

```ts
import { createHtmlRenderer } from "@comark/html";
import embed, { components } from "comark-embed/html";

const render = createHtmlRenderer({ plugins: [embed()], components });
```

For Vue, React, or Svelte, import from `comark-embed/vue`, `comark-embed/react`, or `comark-embed/svelte`. The components add the styles when they mount. When you render on a server, import `comark-embed/style.css` with your own styles so the page doesn't shift. [Renderers](/guide/renderers/) covers using it with other plugins.

## Theme

Players sit in a bordered frame with their link under it. Cards follow shadcn/ui's Item, with a globe, the title, and the host. The rules sit in a `comark` CSS layer, so any plain rule of your own wins.

### Shared tokens

| Token | Used for |
| --- | --- |
| `--comark-background` | Cards |
| `--comark-foreground` | A card's title, the hovered link under a player, the tint behind a loading player |
| `--comark-muted` | The link under a player, a card's host and globe |
| `--comark-border` | The player's frame, cards |
| `--comark-accent` | The hovered card, the globe's tile |
| `--comark-ring` | Focus rings |
| `--comark-radius` | Corners of frames and cards |
| `--comark-font` | The link under a player, cards |

### Variables

Set them on `.ce`:

| Variable | Default | Used for |
| --- | --- | --- |
| `--ce-app-height` | `30rem` | The height of CodePen, StackBlitz, and Figma |
| `--ce-short-width` | `20rem` | The widest a YouTube Short gets, centered |

Videos keep 16:9 and Shorts 9:16 at any width. Spotify draws its own card at fixed heights, so its players have no frame.

### Classes and attributes

| Selector | Is |
| --- | --- |
| `figure.ce` | A player, with `data-provider`, such as `youtube`, and `data-size`: `video`, `short`, `compact`, `list`, or `app` |
| `.ce-frame` | The frame that holds the iframe |
| `.ce figcaption` | The link under a player |
| `a.ce-card` | A card, holding a globe, the title in `strong`, and the host in `span` |

### Example

Taller tools and narrower Shorts:

```css
.ce {
  --ce-app-height: 40rem;
  --ce-short-width: 16rem;
}
```
