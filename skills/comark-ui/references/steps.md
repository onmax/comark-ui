# Numbered steps

comark-steps turns the headings inside `::steps`, or one numbered list, into numbered steps joined by a line. Use it for instructions the reader follows in order, such as how to reproduce a bug or set up a project.

## Syntax

```md
::steps
### Open the dashboard
Go to **Correlations** and pick the Berlin office.

### Add three filters
Add **Moon phase**, **Vibes**, and **Rubber ducks**.

### Narrow the window
At 1024 px wide, **Apply** drops under the filter chips.
::
```

- Each `###` heading starts a step that holds everything up to the next one, code blocks and images included. The heading keeps its id, so a link to `#add-three-filters` and a table of contents still find it.
- `level` is the level of the headings that start each step, from 2 to 6, default 3. Write `::steps{level="2"}` for `##` headings. Deeper headings stay inside their step.
- A block whose only content is one numbered list makes a step of each item, and a list that starts at 3 numbers its steps from 3. Use the list when every step fits on one line.
- A `:::steps{level="4"}` inside a step keeps its own headings and numbers.

The syntax is Nuxt UI's `::steps`, so the same Markdown renders under Nuxt UI.

## Keep only steps inside

Put any introduction above `::steps`, since the block holds only steps. A paragraph before the first heading renders above the steps, and a paragraph beside a numbered list turns the whole block into plain content. Both are reported. The block drops its own `#id` and `.class` without a report, so link to a step through its heading's id.

## Register

- In `comark-ui`: on, as `steps`, with no options.
- Alone: `pnpm add comark @comark/html comark-steps`, then `createHtmlRenderer({ plugins: [steps()], components })` with both from `comark-steps/html`. `comark-steps/vue`, `/react`, and `/svelte` export the same pair for those renderers. It takes no options and goes anywhere in `plugins`.
