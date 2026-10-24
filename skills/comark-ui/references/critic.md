# Suggested edits

comark-critic reads CriticMarkup: insertions, deletions, substitutions, highlights, and comments written inside the text. Use it to review prose in place, such as a docs page or a changelog, where the reader should see each change in its sentence. For a change to code, write a `::diff` instead.

## Syntax

```md
The deploy waits when more than {--twelve--}{++fifteen++} pigeons sit on the roof.

Count them {~~after~>before~~} the stand-up, from the {==east window==}{>>The west one faces the parking lot.<<}.
```

| Mark | Write | Shows as |
| --- | --- | --- |
| Insertion | `{++added++}` | `<ins>`, tinted green |
| Deletion | `{--removed--}` | `<del>`, struck through in red |
| Substitution | `{~~old~>new~~}` | the deletion, then the insertion |
| Highlight | `{==this==}` | `<mark>`, in amber |
| Comment | `{>>why<<}` | a muted chip where it sits |

- Put a comment right after the words it's about. After a highlight, it comments on the highlighted words, as above.
- Text inside a mark is Markdown, so it can hold `**bold**`, code, and links. A `{.class}` right after a mark adds that class beside the mark's own.
- Each mark opens and closes in one paragraph, so mark an edit that spans paragraphs once in each. A mark left open, or a substitution without `~>`, stays as written, and the linter reports it.
- A mark inside a code span stays as written. Write `\{++` to show the characters themselves.
- Leave the spaces around a deleted word as they are. `a {--big--} duck` accepts as `a  duck`, and HTML shows the two spaces as one.

## Register

- In `comark-ui`: on by default, in `view` mode, which shows every mark. `critic: { mode: "accept" }` renders the text with the changes made, and `mode: "reject"` renders it without them. Both drop the comments and show highlights as plain text. The plugin reports any other `mode` and shows the changes. To publish a reviewed draft, keep the marks in the source and parse it a second time in `accept` mode. No component adds the styles, so put `criticCss`, exported by every entry, in the page. Without it, the browser underlines `<ins>`, strikes `<del>`, paints `<mark>` yellow, and shows comments as plain text. `--ccm-ins`, `--ccm-del`, and `--ccm-mark` recolor the marks.
- Alone: `pnpm add comark comark-critic`, then `plugins: [critic()]` with `import critic from "comark-critic"`, and the same `mode` option. Load the styles with `import "comark-critic/style.css"`, or inline the `css` export. It has no components, so it works in any renderer and in streaming parses.
