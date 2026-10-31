---
title: Cast
description: Terminal recordings from asciinema casts, as colored text written in Markdown.
keywords: asciinema, terminal, shell, console, command output, CLI output, recording, screencast, ANSI colors, tty
tagline: A terminal recording from asciinema, shown as colored text a reader can select.
group: Review blocks
icon: square-terminal
blurb: Terminal recordings as text
credits: 'Reads <a href="https://docs.asciinema.org/manual/asciicast/v2/">asciinema</a>''s cast files.'
---

::examples
:::example{label="Test run"}
````md
::cast{title="pnpm test"}
```json
{"version": 2, "width": 52, "height": 9}
[0.3, "o", "$ pnpm test\r\n"]
[0.6, "o", "\r\n \u001b[7m\u001b[36m RUN \u001b[39m\u001b[27m v3.2.4 /pigeon-tracker\r\n\r\n"]
[0.9, "o", " \u001b[32m\u2713\u001b[39m test/flock.test.ts \u001b[2m(6 tests)\u001b[22m\r\n"]
[1.2, "o", " \u001b[32m\u2713\u001b[39m test/routes.test.ts \u001b[2m(4 tests)\u001b[22m\r\n"]
[1.5, "o", " \u001b[31m\u2717\u001b[39m test/homing.test.ts \u001b[2m(3 tests | \u001b[22m\u001b[31m1 failed\u001b[39m\u001b[2m)\u001b[22m\r\n"]
[1.8, "o", "\r\n \u001b[2mTests\u001b[22m  \u001b[1m\u001b[31m1 failed\u001b[39m\u001b[22m | \u001b[1m\u001b[32m12 passed\u001b[39m\u001b[22m\r\n"]
```
::
````
:::

:::example{label="Final screen"}
````md
::cast{title="pnpm build"}
```json
{"version": 2, "width": 52, "height": 4}
[0.3, "o", "$ pnpm build\r\n"]
[0.6, "o", "Bundling \u001b[33m[=====     ]\u001b[39m 48%"]
[0.9, "o", "\r\u001b[KBundling \u001b[33m[========= ]\u001b[39m 91%"]
[1.2, "o", "\r\u001b[KBundling \u001b[32m[==========]\u001b[39m done\r\n"]
[1.5, "o", "\u001b[2mdist/\u001b[22m\u001b[36mpigeons.js\u001b[39m  \u001b[1m12.4 kB\u001b[22m\r\n"]
[1.8, "o", "\u001b[2mdist/\u001b[22m\u001b[35mstyle.css\u001b[39m   \u001b[1m3.1 kB\u001b[22m\r\n"]
[2.1, "o", "\u001b[32m\u2713 built in 412ms\u001b[39m\r\n"]
```
::
````
:::

:::example{label="Log"}
````md
::cast{title="pnpm build" mode="log"}
```json
{"version": 2, "width": 52, "height": 4}
[0.3, "o", "$ pnpm build\r\n"]
[0.6, "o", "Bundling \u001b[33m[=====     ]\u001b[39m 48%"]
[0.9, "o", "\r\u001b[KBundling \u001b[33m[========= ]\u001b[39m 91%"]
[1.2, "o", "\r\u001b[KBundling \u001b[32m[==========]\u001b[39m done\r\n"]
[1.5, "o", "\u001b[2mdist/\u001b[22m\u001b[36mpigeons.js\u001b[39m  \u001b[1m12.4 kB\u001b[22m\r\n"]
[1.8, "o", "\u001b[2mdist/\u001b[22m\u001b[35mstyle.css\u001b[39m   \u001b[1m3.1 kB\u001b[22m\r\n"]
[2.1, "o", "\u001b[32m\u2713 built in 412ms\u001b[39m\r\n"]
```
::
````
:::
::

## Features

- The page gets the screen as the terminal last showed it.
- A progress bar redrawn in place shows only its last state, and a cleared screen is gone.
- The output keeps its colors, and a reader can select, search, and copy it.
- No player and no script: the page gets a `pre` with colored spans. The asciinema player weighs 1.4 MB.
- Casts in asciinema's v2 and v3 formats both work.

## Usage

Use the `src` prop to show a cast file, relative to the plugin's `root`.

```md
::cast{src="test.cast"}
::
```

> [!NOTE]
> Only local files are read. In `comarkUi()`, cast reads no files until you pass `root` or `read`, as [Options](#options) shows.

### Inline cast

Write a short cast inside the block instead of in a file, in a code block of its own. Inline casts render whatever the options.

::example
````md
::cast
```json
{"version": 2, "width": 40, "height": 3}
[0.2, "o", "\u001b[32m✓\u001b[39m 12 passed\r\n"]
```
::
````
::

> [!NOTE]
> A block with both `src` and a code block shows the file, and the plugin reports it.

### Mode

Use the `mode` prop to choose what the terminal shows. `screen`, the default, shows its last screen. `log` shows every line printed, from the first, so lines that scrolled off the top stay too.

::example
````md
::cast{mode="log"}
```json
{"version": 2, "width": 40, "height": 2}
[0.3, "o", "$ pnpm build\r\n"]
[0.6, "o", "Bundling \u001b[33m48%\u001b[39m\r\n"]
[0.9, "o", "\u001b[32m✓ built in 412ms\u001b[39m\r\n"]
```
::
````
::

### Title

Use the `title` prop to put a caption above the terminal.

::example
````md
::cast{title="pnpm test"}
```json
{"version": 2, "width": 40, "height": 3}
[0.2, "o", "\u001b[32m✓\u001b[39m 12 passed\r\n"]
```
::
````
::

## Examples

### Record a cast

Install [asciinema](https://docs.asciinema.org/getting-started/) and record the command, with the terminal sized to what the page has room for:

```sh
asciinema rec --cols 80 --rows 20 --command "pnpm test" docs/test.cast
```

Then show it with `::cast{src="test.cast"}`.

### Show a command's output in a review

A screenshot of a terminal can't be searched or copied, and pasting the output loses its colors. Record the command instead and put the cast next to the document:

```sh
asciinema rec --cols 80 --rows 12 --command "pnpm test" evidence/test.cast
```

```md
The flaky homing test passes now:

::cast{src="evidence/test.cast" title="pnpm test"}
::
```

Use `mode="log"` when the part that matters scrolled off the screen, such as the first error in a long build. Keep `--rows` small for the default mode, so the screen holds only the end of the run.

### What the terminal replays

Output events (`"o"`) and resizes (`"r"`) are replayed. Input, markers, and the exit code draw nothing. The terminal knows enough of xterm for what command-line tools print:

- The 16 colors, 256 colors, and 24-bit colors, for text and background, and bold, dim, italic, underline, strikethrough, and inverse.
- Carriage returns and backspaces, cursor moves and positions, erasing a line or the screen, and tabs.
- Wide characters such as CJK and emoji, and long lines wrapping at the terminal's width.
- The alternate screen of full-screen apps such as `vim` or `less`, which disappears when they quit, as in a real terminal.

Window titles and links are dropped. A bare `\n` starts a new line from the left, so a cast written by hand doesn't need `\r\n`.

## API

### Props

| Prop | Default | Description |
| --- | --- | --- |
| `src` | — | The cast file, relative to the plugin's `root`. Only local files are read. |
| `mode` | `screen` | `screen` shows the terminal's last screen. `log` shows every line printed, from the first. |
| `title` | — | A caption above the terminal. |

### Options

Options go under `cast` in `comarkUi()`, or to `cast()` when you use it alone. In `comarkUi()`, cast reads no files until you pass `root` or `read`. Inline casts render either way.

| Option | Default | Description |
| --- | --- | --- |
| `root` | `"."` | The folder `src` paths start from. A cast can't be read from outside it. |
| `read` | Reads from disk | Reads a file by its path under `root`, and returns its text or `undefined`. Pass one in a browser or an edge runtime. |

The default reader refuses symlinks that lead out of `root`.

### Issues

The plugin adds these problems to `meta.issues`, as [Validation](/guide/validation/) describes:

- The block has no cast: no `src` and no code block.
- The file can't be found or read, sits outside `root`, or isn't a local file.
- The first line isn't a v2 or v3 header.
- A line isn't an event.
- The cast has no output.
- `mode` isn't `screen` or `log`.
- The block has both `src` and a code block.
- A prop isn't one of the above.

Each issue names its block and says how to fix it, and each has its own rule in [Doctor](/doctor/). A cast it can't read renders nothing.

### Package

[comark-ui](/getting-started/) brings `comark-cast` and registers it. To use it alone, install it and pass the renderer's `components`:

```sh
pnpm add comark @comark/html comark-cast
```

```ts
import { createHtmlRenderer } from "@comark/html";
import cast, { components } from "comark-cast/html";

const render = createHtmlRenderer({ plugins: [cast({ root: "docs" })], components });
```

For Vue, React, or Svelte, import from `comark-cast/vue`, `comark-cast/react`, or `comark-cast/svelte`. The components add the styles when they mount. Import `comark-cast/style.css` with your styles so a server-rendered page doesn't shift. [Renderers](/guide/renderers/) covers using it with other plugins.

## Theme

The terminal is a window in the page's scheme, as shadcn/ui draws a code block: a muted surface with a border and three dots. Its 16 colors switch with the scheme, darker on a light page so a program's white and yellow still read, whether the system or a `.light` or `.dark` class above sets it.

The rules sit in a `comark` CSS layer, so any plain rule of your own wins, except the terminal's background, text color, and margin. A page's `pre` styles would put the program's colors on the wrong ground or push the terminal away from its caption. Change the colors through the variables, and space the `.cca` figure instead.

### Shared tokens

The frame reads these [shared tokens](/guide/theming/):

| Token | Used for |
| --- | --- |
| `--comark-border` | The frame's border |
| `--comark-radius` | The frame's corners |
| `--comark-muted` | The dots and the caption |
| `--comark-font` | The caption |

### Variables

Set them on `.cca`:

| Variable | Default | Used for |
| --- | --- | --- |
| `--cca-background` | `--comark-accent` mixed into `--comark-background` | The terminal's background, and inverted text |
| `--cca-foreground` | `--comark-foreground` | Text with no color, and inverted backgrounds |
| `--cca-0` to `--cca-15` | Tailwind's zinc, red, green, yellow, blue, purple, and cyan, a shade darker on a light page | The 16 terminal colors, then their bright versions |

256-color and 24-bit colors are written as they were recorded.

### Classes

| Class | Element |
| --- | --- |
| `.cca` | The figure, with `data-mode` set to `screen` or `log` |
| `.cca-term` | The terminal's `pre` |
| `.cca-f0` to `.cca-f15`, `.cca-b0` to `.cca-b15` | Text and background in a terminal color |
| `.cca-bold`, `.cca-dim`, `.cca-italic`, `.cca-underline`, `.cca-strike` | Text styles |
