# Numbers before and after

comark-metrics draws `:delta` as a number before and after with its arrow, percent, and verdict, `::stats` as a table of befores and afters with a Change column, and `:progress` as a progress bar. Use them where a pull request claims that a size or a speed changed, next to the claim. The plugin works out every change while parsing, so write the two numbers and leave the percent to it.

## Syntax

```md
Moving the map to a worker cut the main bundle :delta{from=412 to=388 unit="kB" better="lower"} on every page.

::stats{better="lower"}
| Metric | Before | After |
| --- | --- | --- |
| JavaScript | 412 kB | 388 kB |
| Largest paint | 2.4 s | 1.9 s |
| Requests | 38 | 41 |
::

Tests moved to Vitest: :progress{value=17 max=20 label="Migrated"}
```

- `:delta` reads `412 kB → 388 kB ↓ 5.8%`. `from` and `to` are required numbers, and `unit`, such as `kB`, `s`, or `%`, goes after both. `better` is `lower` for sizes and durations or `higher` for scores. It colors the change green when it's better and red when it's worse; without it the change is gray. The percent is of `from`, to one decimal. From 0 there is no percent, so the change is the difference, such as `↑ 1.5 s`.
- `::stats` holds one Markdown table of three columns: a name, the value before, and the value after, under any headers. A cell is a number, with commas if you like, and an optional unit after it, the same in both cells of a row. `better` applies to every row, and `unit` names a difference from 0 for cells written without one. The plugin drops anything else inside the block and reports it.
- `:progress` is a native `<progress>` with its percent after it. `value` is required: a fraction from 0 to 1, or a count up to `max`, which is 1 by default. `label` shows before the bar and names it for screen readers. The plugin clamps a `value` outside 0 to `max` and reports it.

## Write the numbers

- Copy the numbers from the tool's output as it prints them: `1,204` and `2.4 s` both read.
- In `from`, `to`, and `value`, write the number alone and put the unit in `unit`. Write a percent of progress as `value=0.85`, or as `value=85 max=100`.
- `better` covers the whole table. When some rows are better lower, such as sizes, and others better higher, such as scores, write two tables.

## Register

- In `comark-ui`: on. It takes no options.
- Alone: `pnpm add comark @comark/html comark-metrics`, then `createHtmlRenderer({ plugins: [metrics()], components })` with both from `comark-metrics/html`. `comark-metrics/vue`, `/react`, and `/svelte` render it too. It has no options and no script.
