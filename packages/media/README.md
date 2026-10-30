# comark-media

[![npm version](https://comark-ui.onmax.me/badge.svg?source=npm-version&package=comark-media&icon=npm)](https://npmx.dev/package/comark-media)
[![npm downloads](https://comark-ui.onmax.me/badge.svg?source=npm-downloads&package=comark-media&period=month&icon=npm)](https://npmx.dev/package/comark-media)
[![license](https://comark-ui.onmax.me/badge.svg?label=license&value=MIT)](https://npmx.dev/package/comark-media)
[![docs](https://comark-ui.onmax.me/badge.svg?label=docs&value=comark-ui.onmax.me)](https://comark-ui.onmax.me/media/)

Videos and audio written as images, as GitLab does. Both get controls on the shadcn/ui tokens, with the browser's own as their fallback. A GitHub attachment link alone in a paragraph plays too, as on GitHub. A [Comark](https://comark.dev) plugin for HTML, Vue, React, and Svelte.

```sh
pnpm add comark comark-media
```

```ts
import { createHtmlRenderer } from "@comark/html";
import media, { components } from "comark-media/html";

const render = createHtmlRenderer({ plugins: [media()], components });
```

```md
![Signing in with a passkey](./login.mp4)

![The spinner while the build runs](./spinner.webm){autoplay loop muted poster="./spinner.png"}

![The new alert sound](./alert.mp3)

https://github.com/user-attachments/assets/2f3c0e3e-1c4b-4c3a-9a6b-0b1e2f3a4b5c
```

An image ending in `.mp4`, `.webm`, `.mov`, or `.m4v` becomes `<video controls playsinline preload="metadata">`, and one ending in `.mp3`, `.wav`, `.ogg`, or `.m4a` becomes `<audio controls preload="metadata">`. The alt text labels the player. `autoplay`, `loop`, `muted`, `poster`, `width`, and `height` pass through. A video at a URL without `width` and `height` gets them while parsing, read from the file's first bytes, so the page keeps its room before it loads; `media({ size: false })` reads no files.

Players come with a play button, the time, a seek bar, and a mute button, drawn with the shared `--comark-*` tokens; a video's float over its bottom edge and add a full screen button. A small script, inlined once per document, runs them. Until it does, and when a file can't play, the browser's own controls show instead, so the file plays without any script. Pass `media({ controls: "native" })` to keep the browser's controls and leave the script out.

The plugin works on Markdown's tokens, before any plugin's `post` step, so comark-zoom never zooms a video and comark-chips never turns an attachment link into a chip, whatever their order.

The plugin adds every problem to `meta.issues`, so a host can reject a document before publishing it: a file without alt text, `autoplay` without `muted`, a `poster` on audio, a `width` or `height` without the other, and a prop it doesn't know. Each issue names the file and says how to fix it.

## Renderers

| Renderer | Import |
| --- | --- |
| `@comark/html` | `comark-media/html`: the styles are inlined once per document |
| `@comark/vue` | `comark-media/vue` |
| `@comark/react` | `comark-media/react` |
| `@comark/svelte` | `comark-media/svelte` |

Each entry exports the parse plugin as `default` and the renderer's `components`. The Vue, React, and Svelte components add the styles and start the players when they mount; import `comark-media/style.css` with your styles so a server-rendered page doesn't shift. The styles read the shared `--comark-*` tokens and sit in a `comark` CSS layer, so any plain rule of your own wins.
