# Partials and snippets from files

comark-include pastes a Markdown file, or lines of a source file as a code block, into the document before Comark parses it. Use it to keep one copy of a section that several pages share, or to show real source that stays in step with the code.

## Syntax

```md
## Install

:include{src="./parts/install.md"}

The bug estimate, straight from the source:

:include{src="/src/ducks.ts" region="estimate"}
```

| Prop | What it does |
| --- | --- |
| `src` | Required. A local file. A relative path starts at the document's folder, or at the including partial's; a leading `/` starts at `root`. |
| `lines` | `"10:24"` keeps lines 10 to 24, 1-based and inclusive; `"10:"` and `":24"` leave one end open. Lines count from the top of the file, frontmatter included. |
| `region` | Keeps the lines between `#region estimate` and `#endregion estimate` and drops the marker lines. A marker starts its line, after a comment opener such as `//`, `#`, or `<!--`. |
| `code` | Shows a Markdown file as a code block instead of pasting it. |
| `lang` | Sets the code block's language in place of the extension, and makes a Markdown file a code block too. |

The plugin pastes a `.md`, `.mdc`, or `.markdown` file without its frontmatter, and that file's own includes resolve from its folder. Any other file becomes a fenced code block in its extension's language, with a fence longer than any backtick run inside. `lines` and `region` don't combine, and the plugin dedents the lines either one keeps.

## Place it

- Write `:include` with one colon, alone on its line. A `::include` takes in the rest of the document. An include that shares its line with text or a list marker, or sits in a blockquote, renders nothing. The plugin reports all three.
- To put a partial in a list item, indent the include on its own line under the item's text. The pasted lines take its indent.
- Close every `::` block inside the partial. The plugin closes one left open at the end of its paste, and reports it.
- An include inside fenced code stays as written, so a page can show the syntax.
- No Comark renderer runs on GitHub or npm, so a README there shows `:include` as written. In a README, use automd's `file` generator, which takes the same `src`, `lines`, `code`, and `lang` and writes the text into the file.

The plugin drops an include that fails and reports why, such as a missing file, a path that leaves `root`, a URL, a range past the end, a region the file doesn't mark, a cycle, or nesting past `depth`.

## Lint it

comark-linter doesn't load comark-include, so it reports `:include` as an unknown component until a [lint config](lint.md) adds `include({ root })` to its `plugins`. That one `include()` serves every file in the run, so a relative `src` resolves from its `base`. In documents outside `base`, start `src` with `/` so it resolves the same in the app and the linter.

## Register

- In `comark-ui`: off, since it reads files from disk. `include: { root: "content", base: "guide" }` turns it on; `include: true` reads under the working directory.
- Alone: `pnpm add comark comark-include`, then `parseMarkdown(markdown, { plugins: [include({ root: "content", base: "guide" })] })` with `include` from `comark-include`, first in `plugins`. It has no components, because the pasted text renders like the rest of the document in any renderer, and it doesn't work with streaming parses. `root` is the folder includes can't leave (default `"."`). `base` is the document's folder under `root` (default `""`); Comark doesn't tell plugins where a document lives, so set it per document. In a browser or an edge runtime, pass `read(path)`, which returns a file's text by its POSIX path under `root`, or `undefined`, and may be async. The default reader refuses symlinks that lead out of `root`, and your own must refuse them too. `depth` caps nesting (default 8). `meta.includes` lists every file a document read or tried to read, so a watcher can rebuild the page when one changes or appears.
