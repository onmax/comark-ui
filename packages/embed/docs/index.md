---
title: Embed
description: Videos, audio, and live code from a link, written in Markdown.
keywords: YouTube, Vimeo, Loom, Spotify, CodePen, StackBlitz, Figma, video, iframe, player, oEmbed, live code
tagline: Paste a YouTube, Vimeo, Loom, Spotify, CodePen, StackBlitz, or Figma link and get its player, with the link under it. Nothing is fetched.
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

The plugin reads the player's address from the link alone, so a document renders the same offline, in tests, and at build time. The link stays under every player, so the page still makes sense in a feed reader or where iframes are blocked. In print, each player gives way to its address.

## Usage

### Embed

```md
::embed{url="https://youtu.be/KCrXgy8qtjM" title="Watch before standup: Vite in 100 Seconds" start=30}
::
```

Close the block with `::` on the next line. The plugin drops anything inside it.

| Prop | What it does |
| --- | --- |
| `url` | Required. An `https://` link. |
| `title` | Names the player for screen readers and is the text of the link under it. Without it the link shows the host. |
| `start` | Seconds into a YouTube or Vimeo video to start at. A YouTube link's own `t=` works too. |

### Providers

| Provider | Links it reads | Player |
| --- | --- | --- |
| YouTube | `youtube.com/watch?v=`, `youtu.be/`, `/shorts/`, `/embed/`, `/live/` | YouTube's privacy-enhanced mode, `youtube-nocookie.com`. Shorts are tall. |
| Vimeo | `vimeo.com/<number>`, unlisted links with their hash, `player.vimeo.com/video/` | With `dnt=1`, so Vimeo doesn't track the session. |
| Loom | `loom.com/share/<id>` | Loom's embed player. |
| Spotify | `open.spotify.com/` track, album, playlist, episode, show, and artist links | A compact player for a track or an episode, a full one for the rest. |
| CodePen | `codepen.io/<user>/pen/<id>` | The pen's result. |
| StackBlitz | `stackblitz.com/edit/<project>`, `stackblitz.com/github/<owner>/<repo>[/<path>]` | The project or GitHub branch, tag, commit, or directory, keeping options such as `file` and `view`. |
| Figma | `figma.com/design`, `proto`, `board`, `slides`, and `deck` links | Figma's embed, keeping `node-id`. |

A StackBlitz project that runs in WebContainers, such as a Node or Vite starter, needs a cross-origin-isolated page and a supported browser. Without them, its preview may fail with "Unable to run Embedded Project". StackBlitz lists the [supported browsers](https://developer.stackblitz.com/platform/webcontainers/browser-support) and the [browser configuration](https://developer.stackblitz.com/platform/webcontainers/browser-config).

A project that runs in the browser alone, such as the `typescript` starter, doesn't need that isolation. It still needs one of StackBlitz's [supported embedding environments](https://developer.stackblitz.com/guides/integration/embedding).

### Cards

Any other `https://` link renders as a card with its `title` and host. Cards don't fetch the page's title yet, so give each one a `title`.

### Issues

The plugin adds every problem to `meta.issues`, as [Validation](/guide/validation/) describes:

- A missing `url`.
- A `url` that isn't `https://`. The block renders nothing.
- A provider's link it can't read an ID from. The block renders as a card.
- A card without a `title`.
- A `start` that isn't whole seconds, or that is set on a player that can't seek.
- Content inside the block.

Each issue names its block and says how to fix it.

## API

The plugin takes no options. In `comarkUi()`, `embed: false` turns it off.

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

Players and cards read these [shared tokens](/guide/theming/):

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

### Classes

A player is a `figure.ce` with `data-provider`, such as `data-provider="youtube"`, and `data-size`: `video`, `short`, `compact`, `list`, or `app`. It holds `.ce-frame` with the iframe, and a `figcaption` with the link. A card is an `a.ce-card` holding a globe, the title in `strong`, and the host in `span`.

```css
.ce {
  --ce-app-height: 40rem;
  --ce-short-width: 16rem;
}
```
