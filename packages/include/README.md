# comark-include

[![npm version](https://npmx.dev/api/registry/badge/version/comark-include)](https://npmx.dev/package/comark-include)
[![npm downloads](https://npmx.dev/api/registry/badge/downloads-month/comark-include)](https://npmx.dev/package/comark-include)
[![install size](https://npmx.dev/api/registry/badge/size/comark-include)](https://npmx.dev/package/comark-include)
[![license](https://npmx.dev/api/registry/badge/license/comark-include)](https://npmx.dev/package/comark-include)
[![docs](https://img.shields.io/badge/docs-comark--ui.onmax.me-14b8a6?labelColor=0a0a0a)](https://comark-ui.onmax.me/include/)

Include Markdown partials and code snippets from files, with `:include{src="./part.md"}`. A [Comark](https://comark.dev) parse plugin: the included text renders as the rest of the document does, in any renderer.

```sh
pnpm add comark comark-include
```

```ts
import { parseMarkdown } from "comark";
import include from "comark-include";

const document = await parseMarkdown(markdown, {
  plugins: [include({ root: "content", base: "guide" })],
});
```

Each include sits alone on its own line:

```md
:include{src="./parts/pizza-policy.md"}

:include{src="/src/ducks.ts" lines="10:24"}

:include{src="/src/ducks.ts" region="estimate"}
```

A `.md`, `.mdc`, or `.markdown` file is pasted as Markdown, without its frontmatter, and its own includes resolve from its folder. Any other file becomes a fenced code block in the language of its extension, with a fence longer than any backtick run in the file.

| Argument | |
| --- | --- |
| `src` | The file. A relative path starts at the document's folder, or at the including partial's; `/` starts at `root`. Required. |
| `lines` | `"10:24"`: lines 10 to 24, 1-based and inclusive. `"10:"` and `":24"` leave one end open. Lines count from the top of the file, frontmatter included, as in an editor, but frontmatter is never pasted. |
| `region` | The lines between `#region estimate` and `#endregion estimate`. A marker starts its line, after a comment opener if any: `//`, `#`, `/*`, `<!--`, `--`, `;`, `%`, or `'`. Marker lines are dropped. |
| `code` | Fences a Markdown file instead of pasting it. |
| `lang` | The fence's language, instead of the extension. Fences the file too. |

`lines` and `region` are dedented. An include inside fenced code stays as it is, even in a list item or a blockquote, so docs can show the syntax, and pasted lines are indented like the include line, so a partial can sit in a list item.

## Options

| Option | |
| --- | --- |
| `root` | The folder includes can't leave. Default `"."`, the working directory. |
| `base` | The document's folder relative to `root`, since Comark doesn't tell plugins where a document lives. Default `""`. |
| `read(path)` | Reads a file by its POSIX path relative to `root` and returns its text, or `undefined` when it doesn't exist. It may be async. The default reads from disk, so pass your own in a browser or an edge runtime. |
| `depth` | How many levels of includes may nest. Default 8. |

Paths are normalized as strings, so `../` can't leave `root` in any runtime, and `read` only ever gets paths under it. The default reader also resolves symlinks and refuses a file whose real path is outside the real `root`. A custom `read` gets no such check: if its files can hold symlinks, it has to refuse the ones that lead out.

`meta.includes` lists every file the document included or tried to include, so a watcher can rebuild when one changes or appears.

## Issues

An include that fails is dropped, and the plugin adds a sentence to `meta.issues` that names it and says how to fix it:

```txt
include "./duck-log.md": file not found. It resolved to "guide/duck-log.md" under the root; check the path or base.
include "./pizzas.md": guide/pizzas.md includes itself (guide/pizzas.md -> guide/merged-prs.md -> guide/pizzas.md). Remove one of the includes.
```

It reports a missing `src`, an argument it doesn't know, a missing file, a path that leaves the root, a URL, a cycle, nesting past `depth`, a `lines` range that is malformed or runs past the end, a missing or unclosed `region`, `lines` with `region`, a reader that throws, and an include that isn't alone on its line or is written `::include`. A partial that leaves a `::block` open is closed at the end of its paste and reported. Rendering never throws.

## Why a text splice

The plugin pastes the files into the Markdown before Comark tokenizes it, so the document parses once: heading ids stay unique across partials, and every other plugin runs once over the whole thing. Comark closes open blocks before plugins run, which is why an include is `:include` on a line of its own: a bare `::include` line would take in the rest of the document.

Streaming parses aren't supported: each chunk would read the files again and paste them into a partial document.

## On GitHub and npm

GitHub and npm show a README's source, and no Comark renderer runs there. For files read there, use [automd](https://github.com/unjs/automd)'s `file` generator, which writes the included text into the file itself. Its arguments share these names: `src`, `lines="a:b"`, `code`, and `lang`.
