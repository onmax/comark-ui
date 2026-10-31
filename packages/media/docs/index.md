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

### Room before it loads

Give a video its `width` and `height` in pixels so the page keeps its room before it loads:

```md
![Signing in with a passkey](./login.mp4){width=1280 height=720}
```

`media({ size: true })` also reads remote videos' dimensions from their first bytes while parsing. Enable it only for trusted documents: requests follow redirects and can reach private networks. Without a size, a video takes a 16:9 box until its own size is known. Pass `media({ size: false })` to disable measurement.

### The browser's controls

Use `controls: "native"` to always show the browser's controls and leave the script out.

```ts
media({ controls: "native" });
```

### Plugin order

Its place in `plugins` doesn't matter. [comark-zoom](/zoom/) never sees a video as an image to zoom, and [comark-chips](/chips/) never turns a GitHub attachment link into a chip.

### Private attachments

A GitHub attachment from a private repository only plays for a reader signed in to GitHub with access to it. For a page that readers outside the repository see, download the file and serve it with the page instead.

## Accessibility

Each player is a group named by its alt text. Its buttons are named for what they do next: Play or Pause, Mute or Unmute, Full screen or Exit full screen. The seek bar is a slider named "Seek" that reads its position, such as "0:12 of 1:30". The volume is a slider named "Volume" in a panel over the mute button, which opens when the pointer or the focus reaches the button; a touch screen has no panel, since its own buttons set the volume. Turning the volume to zero mutes the player. A click on a video plays or pauses it.

### Keyboard interactions

The keys work once the script runs. Until then, the browser's own controls take them.

| Key | Description |
| --- | --- |
| `Tab`, `Shift+Tab` | Moves between the play button, the seek bar, the mute button, the volume, and the full screen button. |
| `Enter`, `Space` | Presses the focused button: plays or pauses, mutes or unmutes, or enters or leaves full screen. |
| `ArrowLeft`, `ArrowDown` | On the seek bar, moves back 5 seconds, or a tenth of a clip shorter than 50 seconds. |
| `ArrowRight`, `ArrowUp` | On the seek bar, moves forward by the same step. |
| Arrow keys, `Home`, `End` | On the volume, turns it down or up by 5%, or to silent or full. |

In a right-to-left page, `ArrowLeft` and `ArrowRight` swap.

## API

### Props

| Prop | Default | Description |
| --- | --- | --- |
| `autoplay` | `false` | Starts playing when the page loads. Browsers only allow it with `muted`. |
| `loop` | `false` | Starts again at the end. |
| `muted` | `false` | Starts without sound. |
| `poster` | — | An image to show before a video plays. Video only. |
| `width`, `height` | — | The video's size in pixels, together. The page keeps that room until the video loads. Video only. |

Write `{loop=false}` to turn a prop off. Other props, such as a class, are dropped.

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
| `size` | Data URIs only | Reads video dimensions while parsing. `true` also fetches remote URLs with range requests; enable it only for trusted documents. `false` disables measurement. |

### Issues

The plugin adds these problems to `meta.issues`, as [Validation](/guide/validation/) describes:

- A video or audio file with nothing in its brackets.
- `autoplay` without `muted`.
- A `poster` on audio.
- A `width` or `height` without the other, or one that isn't a whole number of pixels.
- A prop it doesn't know.

Each has its own rule in [Doctor](/doctor/):

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

For Vue, React, or Svelte, import from `comark-media/vue`, `comark-media/react`, or `comark-media/svelte`. The components add the styles and start the players when they mount. Import `comark-media/style.css` with your styles so a server-rendered page doesn't shift. [Renderers](/guide/renderers/) covers using it with other plugins.

## Theme

A video sits in a bordered frame at most the page's width. A bar of controls floats over its bottom edge: a play button, the time, a seek bar, a mute button with the volume over it, and a full screen button. The bar fades out while the video plays, unless the pointer or the focus is on the video. An audio player takes the page's width and is the same bar on its own, without full screen. A player narrower than 24rem gives the seek bar a row of its own above the buttons, and one narrower than 16rem drops the times. Touch video controls drop the times below 18rem to leave room for the larger buttons and hour-form timestamps. The rules sit in a `comark` CSS layer, so any plain rule of your own wins.

### Shared tokens

Players read these [shared tokens](/guide/theming/):

| Token | Used for |
| --- | --- |
| `--comark-background` | The bar, a little see-through over a video, and the seek bar's handle |
| `--comark-foreground` | Faded, the rest of the seek bar |
| `--comark-primary` | The play button and the played part of the seek bar |
| `--comark-primary-foreground` | The play icon |
| `--comark-muted` | The times and the mute and full screen buttons |
| `--comark-border` | A video's frame, the audio bar, and the volume panel |
| `--comark-accent` | The space a video takes before its first frame loads, and hovered buttons |
| `--comark-ring` | Focus rings |
| `--comark-radius` | Corners |
| `--comark-shadow` | The volume panel and the video bar |
| `--comark-font` | The times |

### Classes

| Selector | Is |
| --- | --- |
| `.cm.cm-video`, `.cm.cm-audio` | A player, around the browser's `<video>` or `<audio>` |
| `.cm-bar` | Its controls |
| `.cm-play`, `.cm-time`, `.cm-seek`, `.cm-mute`, `.cm-full` | The play button, the two times, the seek bar, the mute button, and a video's full screen button |
| `.cm-level`, `.cm-volume` | The panel over the mute button and its volume slider |
| `[data-playing]`, `[data-muted]`, `[data-fullscreen]` | A player while it plays, while it's muted, and while a video fills the screen |
| `[data-error]` | A player whose file can't play, which shows the browser's controls instead |
| `video.cm`, `audio.cm` | A player with `controls: "native"` |

The fallback link inside a player shows only in a browser that can't play the file.
