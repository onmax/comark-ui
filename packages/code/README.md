# comark-code

[![npm version](https://comark-ui.onmax.me/badge.svg?source=npm-version&package=comark-code&icon=npm)](https://npmx.dev/package/comark-code)
[![npm downloads](https://comark-ui.onmax.me/badge.svg?source=npm-downloads&package=comark-code&period=month&icon=npm)](https://npmx.dev/package/comark-code)
[![license](https://comark-ui.onmax.me/badge.svg?label=license&value=MIT)](https://npmx.dev/package/comark-code)
[![docs](https://comark-ui.onmax.me/badge.svg?label=docs&value=comark-ui.onmax.me)](https://comark-ui.onmax.me/code/)

Copy and Wrap buttons on every Markdown code block, plus buttons of your own, such as Run, that hand the block's code to your app. Without a script the block shows as it would without the plugin. A [Comark](https://comark.dev) plugin for HTML, Vue, React, and Svelte.

```sh
pnpm add comark comark-code
```

```ts
import { createHtmlRenderer } from "@comark/html";
import code, { components } from "comark-code/html";

const render = createHtmlRenderer({ plugins: [code()], components });
```

Shiki's highlighting and your `pre` styles still apply. Each block gets a header above its first line, with the file's name or the language and the buttons, so they never cover the code. They work in a `comark-tabs` code group whichever plugin comes first.

Copy writes the code to the clipboard and shows a check. When the page can't write to it, such as over plain http, it selects the code and says to press Ctrl+C or ⌘C. Wrap breaks long lines in that block until it's pressed again.

## Lines

Words after the fence's language, written the way [Expressive Code](https://expressive-code.com) writes them, mark lines, fold them, and frame the block:

````md
```ts title="src/zoom.ts" del={3} ins={4} mark={1} showLineNumbers
function close() {
  dialog.close();
  history.back();
  if (opened) history.back();
}
```
````

`ins`, `del`, and `mark` tint lines green, red, or gray; `collapse` folds a range into a `<details>`; `showLineNumbers` and `startLineNumber=120` number the lines; `title` names the block like `[file]`; `wrap` starts it wrapped. Shell blocks are drawn as a terminal, and `frame="none"` turns that off. A ```` ```diff lang="ts" ```` fence takes pasted `git diff` output, highlights it as TypeScript, and marks its `+` and `-` lines. Comark's Shiki plugin redraws every block, so list `shiki()` before `code()`. A range the plugin can't read goes in `meta.issues`.

## Actions

Each action is a button on the code blocks in its `languages`, or on every block without them. It shows a `label`, an Iconify `icon`, or both; an icon-only button needs a `title`:

```ts
const render = createHtmlRenderer({
  plugins: [
    code({
      actions: [
        { id: "run", label: "Run", icon: "lucide:play", languages: ["sh", "bash"] },
        { id: "explain", icon: "lucide:sparkles", title: "Explain this code" },
      ],
    }),
  ],
  components,
});
```

Your app decides what an action does, in the page:

```ts
import { onCodeAction } from "comark-code/client";

const stop = onCodeAction("run", ({ code, language }) => terminal.run(code));
```

`onCodeAction()` listens for one action's clicks. A click also sends a `comark-code-action` event that bubbles up to the page.

## Renderers

| Renderer | Import |
| --- | --- |
| `@comark/html` | `comark-code/html`: the styles and script are inlined |
| `@comark/vue` | `comark-code/vue` |
| `@comark/react` | `comark-code/react` |
| `@comark/svelte` | `comark-code/svelte`, Svelte 5.20 or later |

Each entry exports the parse plugin as `default` and the renderer's `components`.

The buttons read shadcn's CSS variables, such as `--background` and `--border`, when the page has them, and use its neutral theme otherwise. Set the `--comark-*` tokens to theme every comark plugin at once. The rules sit in a `comark` CSS layer, so any plain rule of your own wins, except the two that make room for the header and wrap lines. `--ck-inset` sets how far the buttons sit from the corner and `--ck-button-size` sizes them, and the header grows to fit. `--ck-title-font` sets the title's font; see the code's [Theming page](https://comark-ui.onmax.me/code/#theme).
