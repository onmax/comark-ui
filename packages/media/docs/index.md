---
title: Media
description: Videos and audio in Markdown, written as images.
keywords: video, audio, mp4, webm, mp3, ogg, player, HTML5 video, GitHub attachments
tagline: A player for a video or an audio file, written as an image.
group: Review blocks
icon: film
blurb: Videos and audio as images
credits: 'Syntax from <a href="https://docs.gitlab.com/user/markdown/#media">GitLab</a> and <a href="https://github.blog/news-insights/product-news/video-uploads-available-github/">GitHub</a>. Sample media from <a href="https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/video">MDN</a>, CC0.'
---

::examples
:::example{label="Video"}
```md
The flower opens once the page loads, as it did before the change:

![A flower opening, recorded before the fix](https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.webm){loop muted}
```
:::

:::example{label="Audio"}
```md
The alert sound the reviewer asked for:

![The new alert sound](https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3)
```
:::
::

## Features

- An image that points at a video or audio file plays where it sits, labeled by its alt text.
- A GitHub attachment link alone in its paragraph plays too.
- The syntax isn't new: GitLab plays an image that points at a video, and GitHub plays an uploaded video's link.
- Only the first frame and the length load until the reader presses play.
- The controls match the page. The browser's own show until the script runs, and when the file can't play.
- One player with sound plays at a time. Starting one pauses the others, while a muted one plays on.

## Usage

Write an image whose address ends in a video or audio extension, before any `?` or `#`. [File types](#file-types) lists the extensions.

```md
![Signing in with a passkey](./recordings/login.mp4)
```

The alt text is the player's label for screen readers. It's also the text of a link to the file, for a browser that can't play it. Every other image stays an image.

### Autoplay

Use the `autoplay` prop to start playing when the page loads.

```md
![The spinner while the build runs](./spinner.mp4){autoplay muted}
```

> [!NOTE]
> Browsers only start a video by itself when it's muted, so `autoplay` needs `muted`.

### Loop

Use the `loop` prop to start again at the end.

```md
![The spinner while the build runs](./spinner.mp4){loop}
```

### Muted

Use the `muted` prop to start without sound.

::example
```md
![A flower opening](https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.webm){muted}
```
::

### Poster

Use the `poster` prop to show an image before a video plays.

```md
![The spinner while the build runs](./spinner.mp4){poster="./spinner.png"}
```

> [!NOTE]
> Audio has no picture, so a `poster` on audio is dropped.

### GitHub attachments

A video dropped into a GitHub comment becomes a bare link alone in its paragraph. GitHub plays it, and so does the plugin.

```md
https://github.com/user-attachments/assets/2f3c0e3e-1c4b-4c3a-9a6b-0b1e2f3a4b5c
```

A link with text of its own, or one inside a sentence, stays a link.

## Examples

### Recordings as evidence

A screen recording is often the clearest evidence in a pull request. It shows a reviewer what a screenshot can't: a transition, a loading state, a sound. Keep it short and small:

- Record only the part of the screen that changes, for a few seconds.
- Encode it as H.264 `.mp4` for every browser, or `.webm` for a smaller file. `.mov` files from macOS play in Safari and Chrome but not always in Firefox.
- Describe what happens in the alt text, so a reader who can't play it still learns what it shows.
- Add `loop muted` to a clip that shows one motion, so it reads like an animated screenshot once played.

The player loads only the file's first frame and length until the reader presses play, so a page with several recordings stays light.

### The browser's controls

Use `controls: "native"` to always show the browser's controls and leave the script out.

```ts
media({ controls: "native" });
```

### Plugin order

The plugin works on Markdown's tokens, before any plugin turns them into a tree, so its place in `plugins` doesn't matter. [comark-zoom](/zoom/) never sees a video as an image to zoom, and [comark-chips](/chips/) never turns a GitHub attachment link into a chip.

### Private attachments

A GitHub attachment from a private repository only plays for a reader signed in to GitHub with access to it. For a page that readers outside the repository see, download the file and serve it with the page instead.

## Accessibility

Each player is a group named by its alt text. Its buttons are named for what they do next: Play or Pause, Mute or Unmute, Full screen or Exit full screen. The seek bar is a slider named "Seek" that reads its position, such as "0:12 of 1:30". A click on a video plays or pauses it.

### Keyboard interactions

The keys work once the script runs. Until then, the browser's own controls take them.

| Key | Description |
| --- | --- |
| `Tab`, `Shift+Tab` | Moves between the play button, the seek bar, the mute button, and the full screen button. |
| `Enter`, `Space` | Presses the focused button: plays or pauses, mutes or unmutes, or enters or leaves full screen. |
| `ArrowLeft`, `ArrowDown` | On the seek bar, moves back 5 seconds, or a tenth of a clip shorter than 50 seconds. |
| `ArrowRight`, `ArrowUp` | On the seek bar, moves forward by the same step. |

In a right-to-left page, `ArrowLeft` and `ArrowRight` swap.

## API

### Props

| Prop | Default | Description |
| --- | --- | --- |
| `autoplay` | `false` | Starts playing when the page loads. Browsers only allow it with `muted`. |
| `loop` | `false` | Starts again at the end. |
| `muted` | `false` | Starts without sound. |
| `poster` | — | An image to show before a video plays. Video only. |

Write `{loop=false}` to turn a prop off. Other props, such as `width` or a class, are dropped.

### File types

| Extension | Becomes |
| --- | --- |
| `.mp4`, `.webm`, `.mov`, `.m4v` | `<video controls playsinline preload="metadata">` |
| `.mp3`, `.wav`, `.ogg`, `.m4a` | `<audio controls preload="metadata">` |

### Options

The options go under `media` in `comarkUi()`, or to `media()` when you use the plugin alone.

| Option | Default | Description |
| --- | --- | --- |
| `controls` | `"styled"` | `"styled"` draws the controls with the [shared tokens](/guide/theming/), which a small script runs. `"native"` always uses the browser's controls and leaves the script out. |

### Issues

The plugin adds these problems to `meta.issues`, as [Validation](/guide/validation/) describes:

- A video or audio file with nothing in its brackets.
- `autoplay` without `muted`.
- A `poster` on audio.
- A prop it doesn't know.

Each issue names the file and says how to fix it, and each has its own rule in [Doctor](/doctor/):

```txt
`![](demo.mp4)` has no label. Describe the video in the brackets, like `![Signing in with a passkey](demo.mp4)`.
`![Demo](demo.mp4)`: browsers only start a video by itself when it's muted. Add `muted`, or remove `autoplay`.
```

### Package

comark-ui brings `comark-media` and registers it. To use it alone, install it with Comark and a renderer:

```sh
pnpm add comark @comark/html comark-media
```

Register the plugin and pass the renderer's `components`:

```ts
import { createHtmlRenderer } from "@comark/html";
import media, { components } from "comark-media/html";

const render = createHtmlRenderer({ plugins: [media()], components });
```

The renderer inlines the styles once per document, and the players' script once per document with a player. For Vue, React, or Svelte, import from `comark-media/vue`, `comark-media/react`, or `comark-media/svelte`. The components add the styles and start the players when they mount. Import `comark-media/style.css` with your styles so a server-rendered page doesn't shift. [Renderers](/guide/renderers/) covers using it with other plugins.

## Theme

A video sits in a bordered frame at most the page's width. A bar of controls floats over its bottom edge: a play button, the time, a seek bar, a mute button, and a full screen button. The bar fades out while the video plays, unless the pointer or the focus is on the video. An audio player takes the page's width and is the same bar on its own, without full screen. A player narrower than 24rem gives the seek bar a row of its own above the buttons, and one narrower than 16rem drops the times. Touch video controls drop the times below 18rem to leave room for the larger buttons and hour-form timestamps. The rules sit in a `comark` CSS layer, so any plain rule of your own wins.

### Shared tokens

Players read these [shared tokens](/guide/theming/):

| Token | Used for |
| --- | --- |
| `--comark-background` | The bar, a little see-through over a video, and the seek bar's handle |
| `--comark-foreground` | The play button and the played part of the seek bar, when the page sets no primary color, and, faded, the rest of the seek bar |
| `--comark-muted` | The times and the mute and full screen buttons |
| `--comark-border` | A video's frame and the audio bar |
| `--comark-accent` | The space a video takes before its first frame loads, and hovered buttons |
| `--comark-ring` | Focus rings |
| `--comark-radius` | Corners |
| `--comark-font` | The times |

The play button and the played part of the seek bar use Nuxt UI's `--ui-primary`, else your `--primary`, when the page sets one. The play icon uses `--primary-foreground`.

### Classes

| Selector | Is |
| --- | --- |
| `.cm.cm-video`, `.cm.cm-audio` | A player, around the browser's `<video>` or `<audio>` |
| `.cm-bar` | Its controls |
| `.cm-play`, `.cm-time`, `.cm-seek`, `.cm-mute`, `.cm-full` | The play button, the two times, the seek bar, the mute button, and a video's full screen button |
| `[data-playing]`, `[data-muted]`, `[data-fullscreen]` | A player while it plays, while it's muted, and while a video fills the screen |
| `[data-error]` | A player whose file can't play, which shows the browser's controls instead |
| `video.cm`, `audio.cm` | A player with `controls: "native"` |

The fallback link inside a player shows only in a browser that can't play the file.
