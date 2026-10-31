# Code blocks

comark-code puts Copy and Wrap on every code block. It also reads options after a fence's language, written the way Expressive Code writes them. They mark lines as added, deleted, or worth a look, fold lines away, number them, and frame shell sessions as a terminal. Use the markers to point at the lines your text talks about, such as the fix in a pull request.

## Syntax

````md
```ts title="src/zoom.ts" del={3} ins={4} mark={1}
function close() {
  dialog.close();
  history.back();
  if (opened) history.back();
}
```
````

| Option | What it does |
| --- | --- |
| `ins={4}` | Marks lines as added, in green with a `+`. |
| `del={3}` | Marks lines as deleted, in red with a `−`. Copy leaves them out, so the block copies as the code after the change. |
| `mark={1}` | Highlights lines to look at, like Comark's own `{1}`. |
| `collapse={2-7}` | Folds lines behind a row that counts them. A click opens them. |
| `showLineNumbers` | Numbers the lines. |
| `startLineNumber=120` | Numbers the lines from 120, and turns numbers on. |
| `title="src/zoom.ts"` | Titles the block, like Comark's `[src/zoom.ts]`. A block without one shows its language. |
| `frame="terminal"` | Draws a terminal window. `frame="code"` or `frame="none"` draws a plain block. |
| `wrap` | Starts the block with Wrap on. |

A range is one line, `{7}`, a run, `{3-4}`, or a list of both, `{1, 3-4}`, always in braces. Ranges count the block's own lines from 1, folded lines included, whatever `startLineNumber` says: `startLineNumber=120 ins={3}` marks the line numbered 122.

`sh`, `bash`, `zsh`, `shell`, `shellscript`, `shellsession`, `console`, and `ansi` blocks draw as terminals unless their title is a file name, such as `install.sh`. A terminal's header shows its title but not its language. In a code group the tab names the block, so a terminal there draws no window.

When the host runs Shiki's notation transformers, comments such as `// [!code ++]`, `// [!code --]`, `// [!code highlight]`, `// [!code focus]`, `// [!code error]`, and `// [!code warning]` mark lines too, and comark-code styles them.

## Show a change

- Mark a change of a few lines with `ins` and `del` on the code you write out.
- Paste `git diff` output into a `diff` fence with `lang`, as below. The code highlights as that language, each leading `+` or `-` becomes `ins` or `del`, and the `@@` hunk headers and the file headers above them go away. Without `lang`, the fence stays a plain diff.
- For a suggested change, the way a pull request review shows one, write comark-diff's `::diff` with the code before and after.
- `mark` the lines your text names, and `collapse` the imports and setup the reader can skip.

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

A range past the block's last line is reported. One that lands on the wrong line inside the block isn't, so count the lines before you mark them.

## Add buttons

`code({ actions })` adds the host's own buttons before Wrap and Copy, on the blocks in each action's `languages`, or on every block when it lists none. A button shows a `label`, an `icon`, or both. The icon is an Iconify name, such as `lucide:play`, or an image URL, and an icon-only button needs a `title` for its tooltip and screen readers.

```ts
code({ actions: [{ id: "run", label: "Run", icon: "lucide:play", languages: ["sh", "bash"] }] });
```

The page decides what a click does. `onCodeAction()` from `comark-code/client` calls your function with the block's code and language, and returns a function that stops listening:

```ts
import { onCodeAction } from "comark-code/client";

const stop = onCodeAction("run", ({ code, language }) => terminal.run(code));
```

A click sends a bubbling `comark-code-action` event with `{ action, code, language }` as its `detail`, so one listener on the page can handle every action. Icons resolve while parsing, through the `iconResolver` option, a `createIcons()` from comark-icon, or from the Iconify API without one. An icon that can't be drawn is reported, and its button shows its title instead.

## Register

- In `comark-ui`: on, as `code`. Pass `code: { actions }` for buttons of your own, and the preset's `icon` options resolve their icons. The preset leaves Shiki out. To add it, put it right before comark-code, which keeps it after comark-tabs:

  ```ts
  import shiki from "comark/plugins/shiki";

  const { plugins, components } = comarkUi();
  plugins.splice(plugins.findIndex((plugin) => plugin.name === "comark-code"), 0, shiki());
  ```

- Alone: `pnpm add comark @comark/html comark-code`, then `createHtmlRenderer({ plugins: [code()], components })` with both from `comark-code/html`. `comark-code/vue`, `/react`, and `/svelte` (Svelte 5.20 or later) export the same pair for those renderers. With Shiki, list `shiki()` before `code()`. Shiki redraws every block, so comark-code listed first loses its markers, numbers, and folds, and reports it. Without Shiki, comark-code splits the lines itself.
