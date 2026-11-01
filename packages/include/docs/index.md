---
title: Include
description: Markdown partials and code snippets from files, written in Markdown.
keywords: partial, import, transclusion, snippet, reuse, include file, source code, code region
tagline: A line that pastes a Markdown partial, or a few lines of real source, into the page from a file.
group: Authoring tools
icon: file-input
blurb: Partials and snippets from files
credits: 'Arguments from <a href="https://github.com/unjs/automd">automd</a>.'
---

::examples
:::example{label="Partial"}
```md
:include{src="./partials/install.md"}
```
:::

:::example{label="Region"}
```md
:include{src="./partials/ducks.ts" region="estimate"}
```
:::

:::example{label="Lines"}
```md
:include{src="./partials/ducks.ts" lines="8:10"}
```
:::

:::example{label="As code"}
```md
:include{src="./partials/install.md" code}
```
:::
::

## Features

- A Markdown file pastes into the page, and any other file becomes a code block in its extension's language.
- Pick lines by number, or by a named region that moves with the code.
- The page parses once, so heading ids stay unique across partials.
- Paths can't leave `root`, in any runtime.
- comark-ui leaves it off until you turn it on, since it reads from disk.

## Usage

Write `:include` with one colon, alone on its line, with the file in `src`.

::example
```md
:include{src="./partials/install.md"}
```
::

A `.md`, `.mdc`, or `.markdown` file pastes without its frontmatter, and its own includes resolve from its folder. An include inside fenced code stays as written.

### Source

Use the `src` prop to name the file. A relative path starts at the page's folder, or at the including partial's. A path that starts with `/` starts at `root`.

```md
:include{src="./parts/pizza-policy.md"}

:include{src="/src/ducks.ts"}
```

### Lines

Use the `lines` prop to include some of the file's lines, 1-based and inclusive. `"10:"` and `":24"` leave one end open. Lines count from the top of the file, frontmatter included.

::example
```md
:include{src="./partials/ducks.ts" lines="8:10"}
```
::

### Region

Use the `region` prop to include the lines between `#region estimate` and `#endregion estimate`. A marker starts its line, after a comment opener if any: `//`, `#`, `/*`, `<!--`, `--`, `;`, `%`, or `'`. The marker lines are left out.

::example
```md
:include{src="./partials/ducks.ts" region="estimate"}
```
::

> [!NOTE]
> Use `lines` or `region`, not both. Together they drop the include and add an issue.

### Code

Use the `code` prop to show a Markdown file as code instead of pasting it.

::example
```md
:include{src="./partials/install.md" code}
```
::

The fence is longer than any backtick run in the file, and the plugin dedents `lines` and `region`.

### Language

Use the `lang` prop to set the code block's language instead of the extension. It shows a Markdown file as code too.

::example
```md
:include{src="./partials/ducks.ts" lines="8:10" lang="js"}
```
::

### Indentation

Indent the include to paste into a list item. The pasted lines take the include's indent.

```md
1. Count the pigeons on the roof.

   :include{src="./parts/pigeon-count.md"}
2. Postpone the deploy.
```

## Examples

### One parse

The plugin pastes the files into the Markdown before Comark reads it, so every other plugin runs once over the whole page.

Streaming parses aren't supported.

### Files in a browser

In a browser or an edge runtime, pass your own `read`:

```ts
const files = import.meta.glob("./content/**/*.md", { query: "?raw", import: "default" });

include({ read: async (path) => files[`./content/${path}`]?.() });
```

### GitHub and npm

GitHub and npm render a README without Comark. For those files, use [automd](https://github.com/unjs/automd)'s `file` generator, which writes the included text into the file. It takes the same `src`, `lines="a:b"`, `code`, and `lang` arguments.

## API

### Props

| Prop | Default | Description |
| --- | --- | --- |
| `src` | — | Required. The file. A relative path starts at the page's folder, or at the including partial's. A path starting with `/` starts at `root`. |
| `lines` | The whole file | `"10:24"`: lines 10 to 24, 1-based and inclusive. `"10:"` and `":24"` leave one end open. Lines count from the top of the file, frontmatter included. |
| `region` | — | The lines between `#region name` and `#endregion name`, without the marker lines. Can't go with `lines`. |
| `code` | `false` for Markdown, `true` for any other file | Shows a Markdown file as code instead of pasting it. |
| `lang` | The file's extension | The code block's language. Setting it shows a Markdown file as code. |

### Options

The plugin reads files from disk, so it's the one plugin comark-ui leaves off. Turn it on with `include: true` or with options under `include` in `comarkUi()`. Alone, pass them to `include()`:

```ts
const render = createHtmlRenderer(comarkUi({ include: { root: "content", base: "guide" } }));
```

| Option | Default | Description |
| --- | --- | --- |
| `root` | `"."`, the working directory | The folder includes can't leave. |
| `base` | `""`, the root | The page's folder relative to `root`. |
| `read(path)` | Reads from disk | Reads a file by its POSIX path relative to `root`, and returns its text or `undefined`. It may be async. |
| `depth` | `8` | How many levels of includes may nest. |

`../` can't leave `root` in any runtime, and `read` only gets paths under it. The default reader also refuses symlinks that lead out of `root`. Your own `read` must refuse them itself.

### Meta

| Field | Description |
| --- | --- |
| `meta.includes` | Every file a page included or tried to include, relative to `root`, so a watcher can rebuild it when one changes or appears. |

### Issues

The plugin drops an include that fails. Its sentence in `meta.issues` names the include and the fix, as [Validation](/guide/validation/) describes:

```txt
include "./duck-log.md": file not found. It resolved to "guide/duck-log.md" under the root; check the path or base.
include "../../etc/passwd": the path leaves the root. Move the file under the root or widen `root`.
include "./pizzas.md": guide/pizzas.md includes itself (guide/pizzas.md -> guide/merged-prs.md -> guide/pizzas.md). Remove one of the includes.
```

It reports:

- A missing `src`, or an argument it doesn't know.
- A missing file, a path that leaves the root, or a URL.
- A `base` option that leaves the root.
- A cycle, or nesting past `depth`.
- A `lines` range that is malformed or runs past the end.
- A missing or unclosed `region`, or `lines` with `region`.
- A reader that throws.
- An include that isn't alone on its line, or is written `::include`.

If a partial leaves a `::block` open, the plugin closes it at the end of the paste and reports it. Each problem has its own rule in [Doctor](/doctor/).

### Package

comark-ui installs `comark-include` and registers it when you turn it on. To use it alone, install it and register the plugin:

```sh
pnpm add comark @comark/html comark-include
```

```ts
import { parseMarkdown } from "comark";
import include from "comark-include";

const document = await parseMarkdown(markdown, {
  plugins: [include({ root: "content", base: "guide" })],
});
```
