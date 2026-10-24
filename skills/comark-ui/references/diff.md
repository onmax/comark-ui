# Code changes

comark-diff draws a file's lines before and after as a suggested change, the way a pull request review shows one. Removed lines are red, added lines green, and the words that changed a shade deeper, under a header with the file and the count of lines added and removed. Use it to propose or explain an edit to one file.

## Syntax

````md
::diff{line=212 label="Suggested change"}
```ts [packages/zoom/src/client.ts]
function close() {
  dialog.close();
  history.back();
}
```
```ts
function close() {
  dialog.close();
  if (opened) history.back();
}
```
::
````

Inside go two fenced blocks, before then after, in the file's language, and nothing else. Leave the first block empty for a new file, or the second for a deleted one.

| Prop | What it does |
| --- | --- |
| `file` | The file's path. Defaults to the name on the first block, like `` ```ts [src/a.ts] ``; one of the two is required. |
| `line` | The file's line number of the first line in both blocks, a whole number from 1. Without it, the diff has no line numbers. |
| `label` | A heading before the file name, such as "Suggested change". |

A line a block highlights, like `` ```ts {2} ``, stays highlighted. `meta.issues` reports an unknown prop, content beside the blocks, a count of blocks other than two, a `diff` or `patch` block, a missing file name, two different file names or languages, a `line` that isn't a whole number from 1, a block over 200 lines, and a diff with no change.

## Keep it to the change

- Show one file per diff, with a few unchanged lines before and after the change. Split a change to two files into two diffs, and write explanations above or below the block.
- Copy both blocks from the file, and start them at the same line, since `line` numbers both from there. Take the number from the file; the plugin can't check it.
- For a change already written as a unified diff, such as `git diff` output, paste it into a `diff` fence outside `::diff`, as the [code reference](code.md) shows.

## Register

- In `comark-ui`: on, in `comark-ui/html` only.
- Alone: `pnpm add comark @comark/html comark-diff`, then `createHtmlRenderer({ plugins: [diff()], components })` with both from `comark-diff/html`. It renders only to HTML, takes no options, and needs no script. Add Comark's `shiki` plugin, in any order, to keep the code's highlighting.
