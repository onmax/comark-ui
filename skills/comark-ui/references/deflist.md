# Definition lists

comark-deflist renders a term followed by `: definition` lines as a native `<dl>`, `<dt>`, and `<dd>`. Use it for a glossary, or for options whose descriptions run past a line.

## Syntax

````md
Flaky test
: A test that passes and fails on the same code.

Rubber duck
: A listener who doesn't need to understand the bug.
: A bath toy.

Deploy freeze
:   No deploys from Friday noon to Monday.

    Hotfixes still ship, with two approvals:

    ```sh
    deploy --hotfix --approvers 2
    ```
````

- A term is one line of inline Markdown. Its definition starts on the next line, or after one blank line, with `:` or `~` and a space.
- Give a term several definitions with one marker line each. Leave a blank line before the next term, since a line right after a definition continues that definition.
- Indent lines past the marker to continue a definition with more paragraphs, a list, or code, with a blank line between its blocks. Start the definition with `:` and three spaces and indent the rest by four, so every block starts in the same column.
- A definition of one paragraph renders its text straight inside `<dd>`, and one of several blocks keeps a `<p>` for each.
- Write the space after the marker. Without it, the line joins the term's paragraph. `:3 to 1` stays text, and `:No deploys` becomes an empty inline component that drops the word `No`. The linter reports such a component only when its name isn't also an HTML tag, so it misses `:A test`.

## Choose a list or a table

Use a definition list when a definition runs past a line or holds more than a paragraph, since a table cell holds neither a list nor code. For short values side by side, such as options and their defaults, a table scans faster.

## Register

- In `comark-ui`: on by default. `deflist: false` turns it off; it takes no options.
- Alone: `pnpm add comark comark-deflist`, then `plugins: [deflist()]` with `import deflist from "comark-deflist"`. It has no components, classes, or styles, so every renderer draws `dl`, `dt`, and `dd` as they are, and the page's own CSS styles them. It works inside any `::component` and in streaming parses.
