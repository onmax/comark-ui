# Terminal output

comark-cast replays an asciinema recording while parsing and shows what the terminal printed as colored text, with no player and no script. Use it to show a command's output in a review, such as a test run or a build, as text the reader can search and copy, colors included.

## Syntax

```md
The flaky homing test passes now:

::cast{src="evidence/test.cast" title="pnpm test"}
::
```

| Prop | What it does |
| --- | --- |
| `src` | The cast file, a local path under the host's `root`. It reads no URLs. |
| `mode` | `screen` (default) shows the terminal's last screen, so a progress bar redrawn in place shows its last state and a cleared screen is gone. `log` shows every line printed, from the first. |
| `title` | The caption above the terminal, such as the command. |

To carry the output without a file, paste the recorded cast into a code block inside the block in place of `src`. Set one or the other; with both, it shows the file and reports the pair.

````md
::cast{title="pnpm build" mode="log"}
```json
{"version": 2, "width": 52, "height": 3}
[0.3, "o", "$ pnpm build\r\n"]
[0.9, "o", "\u001b[32m✓ built in 412ms\u001b[39m\r\n"]
```
::
````

A cast is in asciinema's v2 or v3 format. Its first line is a JSON header whose `width` and `height` (`term.cols` and `term.rows` in v3) size the terminal, 80 by 24 by default. Each line after it is one event: output (`"o"`) prints, a resize (`"r"`) resizes, and input, markers, and the exit code draw nothing. A full-screen app such as `vim` or `less` leaves nothing behind once it quits, as in a real terminal.

## Record the output

```sh
asciinema rec --cols 80 --rows 12 --command "pnpm test" evidence/test.cast
```

- Keep `--cols` at 80 or fewer, since wider lines scroll sideways.
- Keep `--rows` small for `screen`, so the last screen holds only the end of the run.
- Use `mode="log"` when the part that matters scrolled off the screen, such as the first error of a long build.
- Run the linter from the folder the `src` paths start from, since it reads them from the folder it runs in.

## Register

- In `comark-ui`: on, but it reads no cast files until you pass `cast: { root: "docs" }`, or `{ read }` to read them yourself. Inline casts render either way.
- Alone: `pnpm add comark @comark/html comark-cast`, then `createHtmlRenderer({ plugins: [cast({ root: "docs" })], components })` with both from `comark-cast/html`. `root` (default `"."`, the working directory) is the folder `src` paths start from, and it refuses a path or symlink that leads out of it. `read(path)` returns a file's text or `undefined`; pass it in a browser or an edge runtime. `comark-cast/vue`, `/react`, and `/svelte` render it too.
