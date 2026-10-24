# File trees

comark-file-tree draws folders and files from a fenced block, marks entries added, removed, or changed, and puts a note on any line. Use it to show what a change adds, moves, or deletes, or how a project is laid out.

## Syntax

````md
::file-tree
```
packages/
  steps/
    + src/
      + index.ts  # the parse plugin
    ~ package.json
    - legacy.ts  # folded into index.ts
    ...
README.md
```
::
````

Write one entry per line in one fenced block inside `::file-tree`, with any language or none. The block takes no props.

| Written | What it does |
| --- | --- |
| Two spaces before a name | Puts it inside the entry above that starts further left. Four spaces or tabs work the same. |
| `├──`, `└──`, and `│` | Output pasted from `tree`, in Unicode or ASCII. The plugin drops its `.` root and its `2 directories, 3 files` summary. |
| A trailing `/` | Makes a folder. An entry with entries under it is a folder too. |
| `+`, `-`, or `~` and a space before a name | Marks it added, removed, or changed, in a color, with the sign kept beside the name. |
| ` # note` after a name | A note, shown after the name in a lighter color. The `#` needs a space on each side, so `#notes.md` stays a name. |
| `...` | Stands for entries left out. |

## Show a change

- Write the tree in a fence, even a short one. A Markdown list turns `__init__.py` bold and `[id].vue` into a span, so the plugin reports it and renders the list as written.
- List the folders on the path to each changed file, mark the files, and put `...` where unchanged entries sit. Give a file a note when the reason it changed fits in a few words.
- Write any explanation outside the block, since text beside the fence doesn't render.

## Register

- In `comark-ui`: on, under the key `fileTree`. The preset passes its shared icon resolver, so every entry gets its file type's icon from Iconify's vscode-icons set, fetched from the Iconify API unless `icon: { collections }` holds `vscode-icons`. `fileTree: { icons }` adds icons of your own, as below.
- Alone: `pnpm add comark @comark/html comark-file-tree`, then `createHtmlRenderer({ plugins: [fileTree()], components })` with both from `comark-file-tree/html`. Without options, every folder and file gets the same plain glyph and nothing is fetched. Add `comark-icon` and pass `fileTree({ iconResolver: createIcons() })` to draw each file type's icon. `icons` maps a file name, an extension such as `.vue`, or `name/` for a folder to any icon name from [icon](icon.md), and its `folder` and `file` keys set the fallbacks. A name wins over an extension, and an icon that doesn't load leaves the plain glyph. The output needs no script. `comark-file-tree/vue`, `/react`, and `/svelte` render it too.
