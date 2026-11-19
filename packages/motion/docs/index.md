---
title: Motion
description: ViteHub UI's motion in Comark documents, with springs that answer every press, select, and open.
keywords: animation, motion, spring, press, transition, tactile, reduced motion
tagline: The motion of ViteHub UI for every block, by the role of its elements, so no block moves by hand.
group: Page behavior
icon: move
blurb: Springs for every block
credits: 'The motion layer of <a href="https://vitehub.dev/docs/ui/motion">ViteHub UI</a>.'
---

## Features

- Every button, link, and summary squashes a little when you press it and springs back past rest, the same in every block.
- A block's motion comes from what a reader does with it: a selected tab's surface slides to it, a chevron turns, a tooltip rises from its trigger, a dragged handle follows on a spring, and a zoomed picture travels from its place in the page.
- A block draws nothing new for it. The layer reads the roles the blocks already render for keyboard and screen reader users, such as `role="tab"` and `aria-selected`.
- Under `prefers-reduced-motion`, nothing travels, stretches, or wobbles, and a change that must show crossfades in 150ms.
- An app that runs ViteHub UI's layer too shares it: the copy that started first moves each element once.

## Usage

comark-ui turns it on in every entry. Each document gets one `motion-runtime` node, which the HTML renderer writes as one inline script and the Vue, React, and Svelte components start on mount.

```ts
import comarkUi from "comark-ui/html";

const { plugins, components } = comarkUi();
```

Use the `motion` option to leave the blocks still, as they are without a script:

```ts
const { plugins, components } = comarkUi({ motion: false });
```

### Leave a part still

Set `data-motion="none"` on an element of your page, such as the one you render the document into, and nothing in it moves. Its controls still work.

```html
<article data-motion="none">…</article>
```

## Examples

### Record at a quarter speed

The page's `window.__comarkMotion` runs every spring slower, to record or study an effect:

```js
window.__comarkMotion.setMotionSlowFactor(4);
```

`forceReducedMotion(true)` turns reduced motion on whatever the system says, for a test.

## API

### Options

| Option | Default | Description |
| --- | --- | --- |
| `motion` | `true` | comark-ui's option. `false` leaves out the runtime, so nothing moves. |

### Functions

| Function | Description |
| --- | --- |
| `start()` | From `comark-motion/client`. Starts the layer for the page and returns its stop. Every caller shares one start. |
| `createProgress(host)` | From `comark-motion/client`. The layer's progress bar for bundled code: `set(value)`, `done()`, `reset()`. |

The blocks' scripts find `travel`, `ring`, `swapIcon`, `rollNumber`, and `morphText` on `window.__comarkMotion`. Without it, a change happens at once.

### Package

comark-ui brings `comark-motion` and registers it. To use it alone, install it and pass the renderer's `components`:

```sh
pnpm add comark @comark/html comark-motion
```

```ts
import { createHtmlRenderer } from "@comark/html";
import motion, { components } from "comark-motion/html";

const render = createHtmlRenderer({ plugins: [motion()], components });
```

For Vue, React, or Svelte, import from `comark-motion/vue`, `comark-motion/react`, or `comark-motion/svelte`. A page with a strict Content Security Policy allows the inline script by its hash: `scripts` from `comark-motion/html` lists its text.
