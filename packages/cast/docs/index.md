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

- It shows the terminal's last screen, so a redrawn progress bar shows only its final state and a cleared screen is gone.
- The output keeps its colors, and a reader can select, search, and copy it.
- It renders a `pre` with colored spans, with no player and no script. The asciinema player weighs 1.4 MB.
- It reads asciinema's v2 and v3 formats.

## Usage

Use the `src` prop to show a cast file, relative to the plugin's `root`.

```md
::cast{src="test.cast"}
::
```

> [!NOTE]
> Cast reads only local files. In `comarkUi()`, it reads none until you pass `root` or `read`, as [Options](#options) shows.

### Inline cast

Put a short cast in a code block inside `::cast` instead of a file. Inline casts render whatever the options.

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

Use the `mode` prop to choose what the terminal shows. `screen`, the default, shows the last screen. `log` shows every line printed, including those that scrolled off the top.

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

Install [asciinema](https://docs.asciinema.org/getting-started/) and record the command at a size that fits the page:

```sh
asciinema rec --cols 80 --rows 20 --command "pnpm test" docs/test.cast
```

Then show it with `::cast{src="test.cast"}`.

### Show a command's output in a review

Record the command and put the cast next to the document:

```sh
asciinema rec --cols 80 --rows 12 --command "pnpm test" evidence/test.cast
```

```md
The flaky homing test passes now:

::cast{src="evidence/test.cast" title="pnpm test"}
::
```

Use `mode="log"` when the part that matters scrolled off, such as the first error in a long build. In the default mode, keep `--rows` small so the screen holds only the end of the run.

### What the terminal replays

The terminal replays output (`"o"`) and resize (`"r"`) events. Input, markers, and the exit code draw nothing. It handles the xterm features command-line tools print:

- 16, 256, and 24-bit colors for text and background, and bold, dim, italic, underline, strikethrough, and inverse.
- Carriage returns and backspaces, cursor moves and positions, erasing a line or the screen, and tabs.
- Wide characters such as CJK and emoji, and long lines wrapping at the terminal's width.
- The alternate screen of full-screen apps such as `vim` or `less`, gone when they quit.

It drops window titles and links. A bare `\n` starts a new line from the left, so a hand-written cast doesn't need `\r\n`.

## API

### Props

| Prop | Default | Description |
| --- | --- | --- |
| `src` | — | The cast file, relative to the plugin's `root`. Only local files are read. |
| `mode` | `screen` | `screen` shows the terminal's last screen. `log` shows every line printed, from the first. |
| `title` | — | A caption above the terminal. |

### Options

Pass options under `cast` in `comarkUi()`, or to `cast()` alone. In `comarkUi()`, cast reads no files until you pass `root` or `read`.

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

Each names its block and the fix, and has its own rule in [Doctor](/doctor/). A cast it can't read renders nothing.

### Package

[comark-ui](/getting-started/) installs and registers `comark-cast`. To use it alone, install it and pass the renderer's `components`:

```sh
pnpm add comark @comark/html comark-cast
```

```ts
import { createHtmlRenderer } from "@comark/html";
import cast, { components } from "comark-cast/html";

const render = createHtmlRenderer({ plugins: [cast({ root: "docs" })], components });
```

For Vue, React, or Svelte, import from `comark-cast/vue`, `comark-cast/react`, or `comark-cast/svelte`. The components add the styles on mount. Import `comark-cast/style.css` with your styles so a server-rendered page doesn't shift. [Renderers](/guide/renderers/) covers using it with other plugins.

## Theme

The terminal is a muted surface with a border and three dots, like shadcn/ui's code block. Its 16 colors follow the page's color scheme, set by the system or a `.light` or `.dark` class above, and turn darker on a light page so white and yellow text still reads.

The rules sit in a `comark` CSS layer, so any plain rule of yours wins, except on the terminal's background, text color, and margin, which a page's `pre` styles would break. Change the colors through the variables, and space the `.cca` figure instead.

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

256-color and 24-bit colors render as recorded.

### Classes

| Class | Element |
| --- | --- |
| `.cca` | The figure, with `data-mode` set to `screen` or `log` |
| `.cca-term` | The terminal's `pre` |
| `.cca-f0` to `.cca-f15`, `.cca-b0` to `.cca-b15` | Text and background in a terminal color |
| `.cca-bold`, `.cca-dim`, `.cca-italic`, `.cca-underline`, `.cca-strike` | Text styles |
