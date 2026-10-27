# Blocks for before/after evidence

These blocks come with `comark-ui`, or alone with `comark-annotate` and `comark-diff`. The comark-ui skill (`npx skills add onmax/comark-ui`) documents every block in full.

## `::compare`

Two `:::screenshot` blocks inside, before then after. They're titled Before and After unless they set `title`, and their notes are numbered across both.

| Prop | What it does |
| --- | --- |
| `title` | Names the comparison for screen readers. |
| `mode` | `columns` (default) side by side, or `slider`: one full-width image with a divider to drag. Use `slider` when the change is small and in the same spot, such as one label. |

## `:::screenshot`

| Prop | What it does |
| --- | --- |
| `src` | Required. The image URL. |
| `alt` | Required. What the image shows, in one phrase. |
| `viewport` | The capture's size, like `640x420`. Set the same on both sides; a compare reports a mismatch. |
| `href` | The page you captured, such as the preview deployment, linked by its host above the image. |
| `title` | A heading above the image, in place of Before or After. |

Other Markdown inside the block, after its annotations, becomes the caption.

## `::::annotation`

A direct child of a screenshot. Its content is the note, in Markdown.

| Prop | What it does |
| --- | --- |
| `x` `y` `w` `h` | Required. The marked rectangle as percentages of the image, without `%`. |
| `mark` | `box` (default), `circle`, `underline`, `highlight`, `bracket`, `cross`, `check`, or `none`. |
| `color` | `red` for a problem, `green` for the fix, `amber` for a warning, `violet` (default) to point something out, `gray`, or a hex color. |
| `side` | `top` or `bottom` moves the note into the margin with an arrow; in a side-by-side compare, `left` and `right` notes join the numbered list. |

Notes without a `side` are numbered under their image, which is the clearest default in a compare.

## `::diff`

Two fenced blocks inside, the file before and after, starting at the same line.

````md
::diff{line=42 label="The change"}
```tsx [src/members/InviteDialog.tsx]
<button onClick={send}>Send invite</button>
```
```tsx
<button onClick={send} disabled={invalid}>Send invite</button>
```
::
````

`line` is the file's line number of the first line in both blocks. Keep a diff to the few lines that caused the change; the pull request has the rest.
