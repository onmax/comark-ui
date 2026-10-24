---
title: Media
description: Videos and audio in Markdown, written as images.
keywords: video, audio, mp4, webm, mp3, ogg, player, HTML5 video, GitHub attachments
tagline: Point an image at an .mp4 or an .mp3 and get a player labeled with the alt text. GitHub attachment links play too.
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

A screen recording is often the clearest evidence in a pull request. The plugin plays it where it sits and loads only the first frame until the reader presses play. Its controls match the page, with the browser's own as their fallback. Nothing about the syntax is new: GitLab already plays an image that points at a video, and GitHub plays an uploaded video's link.

## Usage

### Files

An image plays when its address ends in one of these extensions, before any `?` or `#`:

| Extension | Becomes |
| --- | --- |
| `.mp4`, `.webm`, `.mov`, `.m4v` | `<video controls playsinline preload="metadata">` |
| `.mp3`, `.wav`, `.ogg`, `.m4a` | `<audio controls preload="metadata">` |

```md
![Signing in with a passkey](./recordings/login.mp4)
```

The alt text is the player's label for screen readers, and the text of a link to the file for a browser that can't play it. Every other image stays an image.

### Props

```md
![The spinner while the build runs](./spinner.mp4){autoplay loop muted poster="./spinner.png"}
```

| Prop | What it does |
| --- | --- |
| `autoplay` | Starts playing when the page loads. Browsers only allow it with `muted`. |
| `loop` | Starts again at the end. |
| `muted` | Starts without sound. |
| `poster` | An image to show before a video plays. |

Write `{loop=false}` to turn a prop off. Other props, such as `width` or a class, are dropped.

### GitHub attachments

A video dropped into a GitHub comment becomes a bare link, such as `https://github.com/user-attachments/assets/2f3c0e3e-…`, alone in its paragraph. GitHub plays it, and so does the plugin. A link with text of its own, or one inside a sentence, stays a link.

### Issues

The plugin adds every problem to `meta.issues`, as [Validation](/guide/validation/) describes: a video or audio file without alt text, `autoplay` without `muted`, a `poster` on audio, and a prop it doesn't know. Each issue names the file and says how to fix it, and each has its own rule in [Doctor](/doctor/):

```txt
`![](demo.mp4)` has no label. Describe the video in the brackets, like `![Signing in with a passkey](demo.mp4)`.
`![Demo](demo.mp4)`: browsers only start a video by itself when it's muted. Add `muted`, or remove `autoplay`.
```

## Examples

### Recordings as evidence

A recording of a change at work shows a reviewer what a screenshot can't: a transition, a loading state, a sound. Keep it short and small:

- Record only the part of the screen that changes, for a few seconds.
- Encode it as H.264 `.mp4` for every browser, or `.webm` for a smaller file. `.mov` files from macOS play in Safari and Chrome but not always in Firefox.
- Describe what happens in the alt text, so a reader who can't play it still learns what it shows.
- Add `loop muted` to a clip that shows one motion, so it reads like an animated screenshot once played.

The player loads only the file's first frame and length until the reader presses play, so a page with several recordings stays light.

### Plugin order

The plugin works on Markdown's tokens, before any plugin turns them into a tree, so its place in `plugins` doesn't matter. [comark-zoom](/zoom/) never sees a video as an image to zoom, and [comark-chips](/chips/) never turns a GitHub attachment link into a chip.

### Private attachments

A GitHub attachment from a private repository only plays for a reader signed in to GitHub with access to it. For a page that readers outside the repository see, download the file and serve it with the page instead.

## API

These options go under `media` in `comarkUi()`, or to `media()` when you use the plugin alone.

### The browser's controls

Videos and audio play with controls drawn with the [shared tokens](/guide/theming/), which a small script runs. Until it runs, and when a file can't play, the browser's own controls show, so the file still plays on a page that strips scripts. To always use the browser's controls, and leave the script out:

```ts
media({ controls: "native" });
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

The renderer inlines the styles once per document, and the players' script once per document with a player. For Vue, React, or Svelte, import from `comark-media/vue`, `comark-media/react`, or `comark-media/svelte`; the components add the styles and start the players when they mount. Import `comark-media/style.css` with your styles so a server-rendered page doesn't shift. [Renderers](/guide/renderers/) covers using it with other plugins.

## Theme

A video sits in a bordered frame at most the page's width, with a bar of controls floating over its bottom edge: a play button, the time, a seek bar, a mute button, and a full screen button. The bar fades out while the video plays, unless the pointer or the focus is on the video. An audio player takes the page's width and is the same bar on its own, without full screen. A player narrower than 18rem drops the times. The rules sit in a `comark` CSS layer, so any plain rule of your own wins.

### Shared tokens

Players read these [shared tokens](/guide/theming/):

| Token | Used for |
| --- | --- |
| `--comark-background` | The bar, a little see-through over a video, and the seek bar's handle |
| `--comark-foreground` | The play button and the played part of the seek bar, without a `--primary` |
| `--comark-muted` | The times and the mute and full screen buttons |
| `--comark-border` | A video's frame and the audio bar |
| `--comark-accent` | The space a video takes before its first frame loads, the rest of the seek bar, and hovered buttons |
| `--comark-ring` | Focus rings |
| `--comark-radius` | Corners |
| `--comark-font` | The times |

The play button and the played part of the seek bar use your `--primary`, or Nuxt UI's `--ui-primary`, when the page sets one, with `--primary-foreground` for the play icon.

### Classes

A video is `.cm.cm-video` around the browser's `<video>`, and audio is `.cm.cm-audio` around its `<audio>`. Each holds `.cm-bar`, its controls: `.cm-play`, two `.cm-time`, `.cm-seek`, `.cm-mute`, and on a video `.cm-full`. A player has `data-playing` while it plays, `data-muted` while it's muted, `data-fullscreen` while a video fills the screen, and `data-error` when the file can't play, which shows the browser's controls instead. With `controls: "native"`, a player is a plain `video.cm` or `audio.cm`. The fallback link inside a player shows only in a browser that can't play the file.
