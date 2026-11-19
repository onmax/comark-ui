# comark-motion

[![npm version](https://comark-ui.onmax.me/badge.svg?source=npm-version&package=comark-motion&icon=npm)](https://npmx.dev/package/comark-motion)
[![npm downloads](https://comark-ui.onmax.me/badge.svg?source=npm-downloads&package=comark-motion&period=month&icon=npm)](https://npmx.dev/package/comark-motion)
[![license](https://comark-ui.onmax.me/badge.svg?label=license&value=MIT)](https://npmx.dev/package/comark-motion)
[![docs](https://comark-ui.onmax.me/badge.svg?label=docs&value=comark-ui.onmax.me)](https://comark-ui.onmax.me/motion)

The motion of [ViteHub UI](https://vitehub.dev/docs/ui/motion) in [Comark](https://comark.dev) documents. Buttons and links squash when pressed, a selected tab's surface slides to it, chevrons turn, tooltips rise from their trigger, and a zoomed picture travels from its place, by the roles the blocks already render.

```sh
pnpm add comark @comark/html comark-motion
```

```ts
import { createHtmlRenderer } from "@comark/html";
import motion, { components } from "comark-motion/html";

const render = createHtmlRenderer({ plugins: [motion()], components });
```

comark-ui turns it on in every entry. Under `prefers-reduced-motion` nothing travels, and `data-motion="none"` on an element leaves everything in it still.
