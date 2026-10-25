---
title: Code
description: Copy and wrap buttons on code blocks.
keywords: copy button, copy to clipboard, clipboard, line wrap, word wrap, code block, run button, actions, Shiki
tagline: Copy and Wrap on every code block, and buttons of your own, such as Run, that hand the code to your app.
group: Page behavior
icon: square-code
blurb: Copy and wrap buttons on code
credits: 'Icons from <a href="https://lucide.dev">Lucide</a>.'
---

::examples
:::example{label="Copy and wrap"}
````md
```sh
pnpm exec spurious correlate --x "rubber ducks bought" --y "bugs fixed" --office berlin --moon-phase waxing --min-r 0.9 > ducks.csv
```
````
:::

:::example{label="Line markers"}
````md
```ts title="src/zoom.ts" del={3} ins={4} mark={1} showLineNumbers
function close() {
  dialog.close();
  history.back();
  if (opened) history.back();
}
```
````
:::

:::example{label="Pasted diff"}
````md
```diff lang="ts"
@@ -12,4 +12,4 @@ export function close() {
 function close() {
   dialog.close();
-  history.back();
+  if (opened) history.back();
 }
```
````
:::

:::example{label="Collapsed lines"}
````md
```ts [vite.config.ts] collapse={2-7} startLineNumber=1
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import icons from "unplugin-icons/vite";
import components from "unplugin-vue-components/vite";
import inspect from "vite-plugin-inspect";
import checker from "vite-plugin-checker";
import { comark } from "./comark";

export default defineConfig({
  plugins: [comark(), vue()],
});
```
````
:::

:::example{label="Terminal"}
````md
```sh title="Install"
pnpm add comark @comark/html comark-code
```
````
:::
::

Each code block gets a header above its first line. The file's name or the language sits on the left and the buttons on the right, so they never cover the code. Copy puts the block's code on the clipboard, and Wrap breaks long lines in that block only. Without a script, the header keeps its title and hides the buttons, since they couldn't work.

Words after the fence's language, written the way [Expressive Code](https://expressive-code.com) writes them, mark lines as added, deleted, or worth a look. They can also fold runs of lines away, number the lines, and draw shell sessions as a terminal. A `diff` fence with a `lang` turns pasted `git diff` output into highlighted code with its lines marked. [Usage](#usage) lists them all.

## Usage

````md
```ts title="src/limits.ts" ins={3} del={2} collapse={5-9} showLineNumbers
export const limits = {
  filters: 3,
  filters: 5,
  sorts: 2,
  // …
};
```
````

Write each option after the fence's language, the way [Expressive Code](https://expressive-code.com) writes them, so a block written for Expressive Code renders the same here. Comark's own `[file]` and `{2}` work beside them.

| Option | |
| --- | --- |
| `ins={3-4}` | Marks lines as added: green, with a `+` before them. |
| `del={2}` | Marks lines as deleted: red, with a `−` before them. Copy leaves them out. |
| `mark={7}` | Marks lines to look at, like Comark's `{7}`. |
| `collapse={1-40}` | Folds lines behind a row that says how many there are. A click opens them, and they stay open. |
| `showLineNumbers` | Numbers the lines. |
| `startLineNumber=120` | Numbers the lines from 120, and turns the numbers on. |
| `title="src/x.ts"` | The block's title, like `[src/x.ts]`. |
| `frame="terminal"` | Draws the block as a terminal window. `frame="none"` or `frame="code"` draws a plain block. |
| `wrap` | Starts the block with Wrap on. |

A range is one line, `{7}`, or the first and last lines of a run, `{3-4}`, and a list takes both, `{1, 3-4}`. Lines count from 1, and collapsed lines are counted where they are.

`sh`, `bash`, `zsh`, `shell`, `console`, and `ansi` blocks are terminals unless their title is a file's name, like `install.sh`. A terminal's header shows its title, if it has one, but not its language. In a [code group](/tabs/#code-group) the tab names the block, so a terminal there draws no window.

The components draw the options with no script beyond the one the buttons already need. A collapsed range is a `<details>` element. The numbers and the signs come from CSS, so selecting the code and copying it gets only the code.

### Diffs

A `diff` fence with a `lang` is highlighted as that language. Each line's leading `+` or `-` becomes `ins` or `del`:

````md
```diff lang="ts"
 function close() {
   dialog.close();
-  history.back();
+  if (opened) history.back();
 }
```
````

Paste the output of `git diff` as it is. When the block has `@@` hunk headers, the plugin drops the hunk headers and the file headers before the first hunk. Without `lang`, a `diff` fence stays a diff in Shiki's colors.

### Shiki

List `shiki` before comark-code in `plugins`:

```ts
const render = createHtmlRenderer({ plugins: [shiki(), code()], components });
```

Shiki draws every block again from its text, so comark-code marks the lines once Shiki has drawn them. If comark-code comes first, a block keeps its title, frame, and Wrap. It loses its markers, numbers, and collapsed ranges, and the plugin says so in `meta.issues`. Without Shiki, comark-code splits the lines itself.

Shiki's [notation transformers](https://shiki.style/packages/transformers) work too. comark-code styles the lines they mark with `// [!code ++]`, `// [!code --]`, `// [!code highlight]`, `// [!code focus]`, `// [!code error]`, and `// [!code warning]`, and the words `// [!code word:name]` marks.

### Issues

The plugin adds every problem to `meta.issues`, as [Validation](/guide/validation/) describes, and never throws:

- A range past the block's last line.
- A range that isn't in braces.
- A `startLineNumber` that isn't a whole number.
- A frame it doesn't draw.

Each issue names the block by its title, or else by its first line, and says how to write it. Each one has its own rule in [Doctor](/doctor/).

## Examples

### Actions

Add buttons of your own with `actions`. Each one goes on the code blocks in its `languages`, or on every block when you leave them out, before Wrap and Copy:

```ts
const render = createHtmlRenderer({
  plugins: [code({ actions: [{ id: "run", label: "Run", languages: ["sh", "bash"] }] })],
  components,
});
```

A button shows a `label`, an `icon`, or both. The icon is an Iconify name, such as `lucide:play`, or an image URL. It resolves while parsing, like comark-icon's icons, and `iconResolver` shares comark-icon's `collections`. An icon-only button needs a `title`, which is its tooltip and the name screen readers read:

```ts
code({
  actions: [
    { id: "run", label: "Run", icon: "lucide:play", languages: ["sh", "bash"] },
    { id: "explain", icon: "lucide:sparkles", title: "Explain this code" },
  ],
});
```

If an icon can't be drawn, the plugin reports it in `meta.issues` under the same [Doctor](/doctor/) rule as an `:icon`'s, and the button shows its title as text instead.

Your app decides what an action does. `onCodeAction()` from `comark-code/client` calls your function with the block's code and language whenever that action's button is clicked, and returns a function that stops it:

```ts
import { onCodeAction } from "comark-code/client";

const stop = onCodeAction("run", ({ code, language }) => terminal.run(code));
```

The callback lives in the page, not in the plugin's options, because the HTML may be rendered on a server where your function can't follow it.

Under the hood, a click sends a `comark-code-action` event from the block. It bubbles up to the page with the action's `id`, the code, and the language in its `detail`. Listen for it yourself to handle every action in one place.

The plugin does nothing else, so `code()` with no actions only adds Copy and Wrap, which come from the components. To see an action's button, add one under `comark-code` in the [playground](/play/)'s Config tab.

### Copy

Copy takes the code's text as written. It leaves out the highlighting, the line numbers, the lines marked `del`, and the row that counts a collapsed range's lines, so a diff copies as the code after the change. Your actions get the same text.

A check mark confirms the copy, and a status line tells screen readers. When the page can't write to the clipboard, such as over plain http, Copy selects the code instead and says to press Ctrl+C or ⌘C.

### Wrap

Wrap breaks long lines in its own block. It stays on until you press it again, and it isn't saved for the next visit. A block whose fence says `wrap` starts with it on. A numbered line wraps under its own code, not under its number.

## API

The options go under `code` in `comarkUi()`, or to `code()` when you use it alone.

| Option | Default | |
| --- | --- | --- |
| `actions` | `[]` | Buttons of your own, before Wrap and Copy, as [Actions](#actions) describes. |
| `iconResolver` | The Iconify API | Resolves the actions' icons, from `createIcons()` in comark-icon. Pass the one the page's other plugins use, so they share its `collections` and `fetch`. comark-ui passes the one its `icon` uses. |

Each action takes:

| Field | |
| --- | --- |
| `id` | Sent as `detail.action` with the `comark-code-action` event, and what `onCodeAction()` listens for. Required. |
| `label` | The button's text. |
| `icon` | An Iconify name, such as `lucide:play`, or an image URL, drawn before the label. With no `label`, the button shows only the icon. |
| `title` | The tooltip, and the name screen readers read. The label by default; required when there is no `label`. |
| `languages` | The languages of the code blocks that get the button, such as `["sh", "bash"]`. Every code block when left out. |

### onCodeAction()

`onCodeAction(id, callback)` from `comark-code/client` calls `callback` with the block's `code` and `language` whenever that action's button is clicked, and returns a function that stops it. A click also sends a `comark-code-action` event that bubbles up to the page with the action's `id`, the code, and the language in its `detail`. [Actions](#actions) shows both.

### Package

comark-ui brings `comark-code` and registers it. To use it alone, install it and pass the renderer's `components`:

```sh
pnpm add comark @comark/html comark-code
```

```ts
import { createHtmlRenderer } from "@comark/html";
import code, { components } from "comark-code/html";

const render = createHtmlRenderer({ plugins: [code()], components });
```

The components replace how `pre` renders. The block keeps its own markup, so Shiki's highlighting and your `pre` styles still apply, and it works in a [code group](/tabs/#code-group) whichever plugin comes first.

For Vue, React, or Svelte, import from `comark-code/vue`, `comark-code/react`, or `comark-code/svelte` (Svelte 5.20 or later). [Renderers](/guide/renderers/) covers server rendering and using it with other plugins.

## Theme

The header sits on the code block's own background, so it takes your `pre` styles and Shiki's theme. The title and buttons follow the shared tokens in [Theming](/guide/theming/). Two variables of their own size the buttons and the header, and a third sets the title's font.

The rules sit in a `comark` CSS layer, so a plain rule of your own wins over any of them. A few rules sit outside the layer, so they beat a page's own `pre` styles:

- The `padding-top` that makes room for the header above the first line.
- The `overflow-x` that clips a marked line's tint.
- Wrap's `white-space`.

A collapsed range's margins, padding, and border are `!important`, so a page's own `details` and `summary` styles can't push it off the lines.

### Shared tokens

| Token | Used for |
| --- | --- |
| `--comark-muted` | The buttons' icons and labels, line numbers, a collapsed range's line, and a terminal's dots |
| `--comark-foreground` | The title, at 72%, hovered buttons' icons and labels, the status line's background, and the tint of `mark` lines, highlighted words, and collapsed ranges |
| `--comark-background` | The status line's text |
| `--comark-border` | The line under a terminal's header |
| `--comark-accent` | Hovered buttons, and Wrap while it's on |
| `--comark-ring` | The focus ring on the buttons and on a collapsed range |
| `--comark-radius` | Code block, button, status line, and highlighted word corners |
| `--comark-font` | Action labels and the status line |

### Variables

Set these on `.ck` or any ancestor, such as `:root`:

| Variable | Default | Used for |
| --- | --- | --- |
| `--ck-inset` | `0.375rem` | How far the buttons sit from the block's top right corner |
| `--ck-button-size` | `1.5rem` | The buttons' height and least width, at least `2.25rem` on touch screens |
| `--ck-title-font` | `ui-monospace, SFMono-Regular, Menlo, monospace` | The title. Set it to your code's font so the title matches the block. |
| `--ck-green` | `#259f56`, `#59d38c` in dark mode | Lines marked `ins`, and their `+` |
| `--ck-red` | `#ee3533`, `#fd736d` in dark mode | Lines marked `del`, and their `−`, and Shiki's errors |
| `--ck-yellow` | `#d49b00`, `#f5c84b` in dark mode | Shiki's warnings |

The dark shades follow the system's dark mode, or a `.dark` class on any ancestor, and a `.light` class keeps the light ones.

The block's `padding-top` is the button size, the inset above the buttons, and `0.75rem` more, so the code starts that far below the header. A marked line is tinted from edge to edge, past the block's padding, so the block clips its overflow. Its sign sits in the block's left padding, which needs to be at least `1.5ch` wide. On a numbered block, the sign sits between the number and the code.

### Classes and attributes

| Selector | Is |
| --- | --- |
| `.ck` | The wrapper around each block, with `data-code-wrap` while Wrap is on |
| `.ck-bar` | The header above the code: the title, then the buttons |
| `.ck-title` | The file's name, or else the language; hidden inside a code group, whose tab names the block |
| `.ck-action` | Each of your [actions](#actions), with its id in `data-code-action`, and `aria-label` when it shows only an icon |
| `.ck-wrap` | Wrap, with `aria-pressed="true"` while it's on |
| `.ck-copy` | Copy, with `data-state="done"` or `data-state="failed"` for a moment after a click |
| `.ck-status` | The line under the header that says what Copy did |
| `[data-code-frame="terminal"]` | On `.ck` when the block is a terminal: dots on the left of the header, and the title in its middle |
| `[data-code-lines]` | On `.ck` when the lines are blocks of their own: the block marks, numbers, or folds lines, or Shiki's transformers mark them |
| `[data-code-numbers]` | On `.ck` when the lines are numbered, with the widest number's digits as its value; each line's number is in `data-line` |
| `.ck-ins`, `.ck-del`, `.ck-mark` | Lines the fence marks with `ins`, `del`, and `mark`. A line Comark's `{2}` highlights has `.highlight`, and Shiki's transformers' `.diff.add`, `.diff.remove`, `.highlighted`, `.focused`, `.error`, and `.warning` look the same as the matching marker |
| `.ck-fold` | A collapsed range: a `<details>` whose `<summary>` counts its lines |
| `[data-code-ready]` | On `<html>` once the script runs; the buttons hide until then, and the title doesn't |

### Example

Bigger buttons further from the corner, and a title in the code's font, lined up with code that has `1.25rem` of side padding:

```css
:root {
  --ck-inset: 0.5rem;
  --ck-button-size: 1.75rem;
  --ck-title-font: "JetBrains Mono", monospace;
}

.ck-bar {
  padding-left: 1.25rem;
}
```

To try it, paste it into Extra CSS in the [playground's Theme pane](/play/#preset=code-copy-and-wrap).
