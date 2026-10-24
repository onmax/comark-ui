# Test results

comark-tests reads a JUnit XML report into one line of passed, failed, and skipped counts with the run's duration, and folds each failure under it with its message and stack. Use it when a pull request or a CI summary reports a test run, so the reader sees the run itself.

## Syntax

````md
::tests{title="Pond census tests"}
```xml
<testsuite name="pond.test.ts" time="0.42">
  <testcase classname="pond.test.ts" name="counts the ducks" time="0.01"/>
  <testcase classname="pond.test.ts" name="counts the geese" time="0.02">
    <failure message="expected 3 to be 4">AssertionError: expected 3 to be 4
    at pond.test.ts:12:20</failure>
  </testcase>
  <testcase classname="pond.test.ts" name="maps the herons"><skipped/></testcase>
</testsuite>
```
::
````

Or read the report from a file, and leave the block empty:

```md
::tests{src="reports/junit.xml" title="CI run"}
::
```

| Prop | What it does |
| --- | --- |
| `src` | The JUnit XML file to read. The path starts at the document's folder, or at the host's `root` when it starts with `/`, and it can't leave `root` or be a URL. Without `src`, the block holds one fence with the report. |
| `title` | Shown before the counts. It also names the results for screen readers, which hear "Test results" without one. |

The block shows:

- The counts of `<testcase>` elements. A case with `<skipped>` is skipped, one with `<failure>` or `<error>` failed, and the rest passed. Failed and skipped show only when there are any.
- The duration, from the `time` of `<testsuites>`, else the sum of the suites' times, else the cases', written as `250 ms`, `4.2 s`, or `1 min 21 s`. A report without times shows none.
- Each failure as a closed disclosure named `classname › name`, with its `message` and its stack in a code block. Failures print open.

The root is `<testsuites>` or a single `<testsuite>`. A report with another root renders nothing, and so does malformed XML, which the plugin reports with its line.

## Use the run's own report

Paste or point at the report the runner wrote, unedited, so the counts are the run's. Most runners write JUnit XML with a flag:

| Runner | Command |
| --- | --- |
| Vitest | `vitest run --reporter=junit --outputFile=junit.xml` |
| Jest | `jest --reporters=jest-junit` |
| pytest | `pytest --junitxml=junit.xml` |
| Go | `go test -v ./... 2>&1 \| go-junit-report > junit.xml` |
| Playwright | `PLAYWRIGHT_JUNIT_OUTPUT_NAME=junit.xml playwright test --reporter=junit` |

When the host reads files, have CI write the report next to the document and point `src` at it. Otherwise paste it into the fence. A long report stays short on the page, since the summary is one line and each failure stays closed until a reader opens it.

## Register

- In `comark-ui`: on. A pasted report renders, and every `src` reports a missing file until you pass `tests: { root: "." }` or `{ read }`.
- Alone: `pnpm add comark @comark/html comark-tests`, then `createHtmlRenderer({ plugins: [tests({ root: "." })], components })` with both from `comark-tests/html`. `root` is the folder `src` can't leave, default `.`, the working directory. `base` is the document's folder under it, where relative paths start. `read(path)` returns a file's text, for browsers and edge runtimes. The output needs no script. `comark-tests/vue`, `/react`, and `/svelte` render it too. With comark-code registered, each stack gets a Copy button.
