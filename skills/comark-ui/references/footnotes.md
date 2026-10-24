# Footnotes

comark-footnotes numbers notes in the order the text first references them and lists them in a section at the end of the page. Use a note for a source, a caveat, or a detail that would break the sentence, such as how you measured a number.

## Syntax

```md
The deploy waits when the roof holds more than 12 pigeons[^count], unless it's a hotfix^[Hotfixes need two approvals.].

[^count]: Counted once, from the window, at 9:00.

    Pigeons that fly off mid-count still count.
```

- `[^label]` marks where a note applies, and a line that starts with `[^label]:` defines it, anywhere in the document. The number comes from the order of first reference, so name the label after the note, such as `[^count]`.
- `^[text]` writes a note in place, with no label and no definition.
- Indent lines by four spaces to continue a definition with more paragraphs, a list, or code. A line that isn't indented continues the paragraph above it.
- Markdown in a note renders, and a note can reference another note. A note referenced twice links back to both places.
- The plugin draws the section, its `Footnotes` heading, and the rule above it, so the document holds only the definitions.

The linter reports a reference with no definition, a definition nothing references, and a label defined twice. Only the first of two definitions shows. It misses a label with a space. `[^my note]` shows as `^my note`, and its definition disappears, so join the words with hyphens: `[^my-note]`.

## Register

- In `comark-ui`: on by default, in place of Comark's own footnotes plugin. `footnotes: { label: "Notes", hr: false, backRef: "↑" }` sets the section's heading (default `"Footnotes"`; `""` leaves it out), whether a rule comes before the section (default `true`), and the link from a note back to its reference (default `"↩"`).
- Alone: `pnpm add comark comark-footnotes`, then `plugins: [footnotes()]` with `import footnotes from "comark-footnotes"`, and the same options. It is named `footnotes`, and Comark keeps the first plugin of a name, so remove `comark/plugins/footnotes` from the list instead of adding this one after it. It has no components and writes the nodes and classes Comark's plugin writes, such as `footnote-ref` and `footnotes`, so styles made for it keep working.
