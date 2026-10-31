---
title: Tests
description: Test results in Markdown, read from a JUnit report.
keywords: JUnit, test report, test results, Vitest, Jest, Playwright, pytest, CI, XML, failures, stack trace
tagline: A summary of a JUnit test report, with the counts, the time, and every failure with its stack.
group: Review blocks
icon: test-tube-diagonal
blurb: Results from a JUnit report
credits: 'Reads the <a href="https://github.com/testmoapp/junitxml">JUnit XML</a> format that Vitest, Jest, pytest, Go, and most CI tools write.'
---

::examples
:::example{label="Failing run"}
````md
::tests{title="Pond census tests"}
```xml
<testsuites time="4.21">
  <testsuite name="pond.test.ts">
    <testcase classname="pond.test.ts" name="counts the ducks" time="0.01"/>
    <testcase classname="pond.test.ts" name="counts the geese" time="0.02">
      <failure message="expected 3 to be 4">AssertionError: expected 3 to be 4
    at pond.test.ts:12:20</failure>
    </testcase>
    <testcase classname="pond.test.ts" name="maps the herons"><skipped/></testcase>
  </testsuite>
</testsuites>
```
::
````
:::

:::example{label="Passing run"}
````md
::tests{title="Pigeon map tests"}
```xml
<testsuite time="1.8">
  <testcase name="draws the plaza"/>
  <testcase name="pins each pigeon"/>
  <testcase name="clusters the flock"/>
</testsuite>
```
::
````
:::
::

## Features

- Reads the JUnit XML that Vitest, Jest, pytest, Go, and most CI tools write, from a file or a fence.
- Shows how many tests passed, failed, and were skipped, and how long they took.
- Each failure opens to its message and stack.
- The counts show with no script.

## Usage

Paste the report into an ` ```xml ` fence inside `::tests`.

::example
````md
::tests
```xml
<testsuite><testcase name="counts the ducks"/></testsuite>
```
::
````
::

### File

Use the `src` prop to read the report from a file.

```md
::tests{src="reports/junit.xml"}
::
```

`src` is a path relative to the document's folder, or to `root` when it starts with `/`.

> [!NOTE]
> `src` can't leave `root` or be a URL. In `comarkUi()`, a `::tests` block reads no files until you pass [options](#options).

### Title

Use the `title` prop to show a title before the counts. It also names the results for screen readers.

::example
````md
::tests{title="Unit tests"}
```xml
<testsuite time="0.4"><testcase name="counts the ducks"/><testcase name="maps the herons"><skipped/></testcase></testsuite>
```
::
````
::

## Examples

### Writing the report

Most runners write JUnit XML with a flag:

| Runner | Command |
| --- | --- |
| Vitest | `vitest run --reporter=junit --outputFile=junit.xml` |
| Jest | `jest --reporters=jest-junit` |
| pytest | `pytest --junitxml=junit.xml` |
| Go | `go test -v ./... 2>&1 \| go-junit-report > junit.xml` |
| Playwright | `PLAYWRIGHT_JUNIT_OUTPUT_NAME=junit.xml playwright test --reporter=junit` |

### Results in a pull request

Have CI write the report next to the review document, then point the block at it:

```md
::tests{src="./reports/junit.xml" title="CI run"}
::
```

The summary is one line, and the failures stay closed until a reader opens one, so a long report doesn't push the rest of the review down. In print, every failure prints open.

## Accessibility

The results are a section named by their title, or "Test results" without one. Each failure is a disclosure, and its summary is a tab stop.

### Keyboard interactions

| Key | Description |
| --- | --- |
| `Tab`, `Shift+Tab` | Moves between the failures. |
| `Enter`, `Space` | Opens or closes the focused failure. |

## API

### Props

| Prop | Default | Description |
| --- | --- | --- |
| `src` | — | The JUnit XML file to read. Without it, the block reads the ` ```xml ` fence inside it. |
| `title` | — | Shown before the counts, and names the results for screen readers. |

### What it shows

- **Passed, failed, and skipped.** Counted from the `<testcase>` elements, so the totals always match the cases. A case with `<failure>` or `<error>` failed, and one with `<skipped>` was skipped. Failed and skipped show only when there are any.
- **Duration.** The `time` of the root element, else the sum of the suites', else the sum of the cases', as `250 ms`, `4.2 s`, or `1 min 21 s`.
- **Failures.** Each one is a `<details>` named `classname › name`, with the failure's `message` and its stack in a code block. With [comark-code](/code/), the stack gets a Copy button.

The root can be `<testsuites>` or a single `<testsuite>`.

### Options

The options go under `tests` in `comarkUi()`, or to `tests()` when you use the plugin alone. In `comarkUi()`, a `::tests` block reads no files until you pass options, such as `comarkUi({ tests: { root: "." } })`.

| Option | Default | Description |
| --- | --- | --- |
| `root` | `"."` | The folder `src` can't leave, as in [comark-include](/include/). |
| `base` | `""` | The document's folder under `root`, where relative paths start. |
| `read` | Reads from disk | A function that takes a path under the root and returns the file's text. Pass it in a browser or an edge runtime. |

### Issues

The plugin adds these problems to `meta.issues`, as [Validation](/guide/validation/) describes:

- A block with no `src` and no ` ```xml ` fence.
- A file that's missing, outside the root, a URL, or can't be read.
- A `base` option that leaves the root.
- XML that isn't well-formed, with the line.
- A document that isn't a JUnit report.
- Content inside a block that has `src`. It's dropped.
- A prop it doesn't read. It's ignored.

A block whose report can't be read renders nothing. Each issue names the block and says how to fix it, and each has its own rule in [Doctor](/doctor/):

```txt
`::tests` 1 ("junit.xml"): its XML is malformed at line 3: `</testsuite>` closes `<testcase>`. Fix the report, or run the tests again to rewrite it.
`::tests` 2: it isn't a JUnit report: its root is `<coverage>`, not `<testsuites>` or `<testsuite>`.
```

### Package

comark-ui brings `comark-tests` and registers it. To use it alone, install it with Comark and a renderer:

```sh
pnpm add comark @comark/html comark-tests
```

Register the plugin and pass the renderer's `components`:

```ts
import { createHtmlRenderer } from "@comark/html";
import tests, { components } from "comark-tests/html";

const render = createHtmlRenderer({ plugins: [tests({ root: "." })], components });
```

For Vue, React, or Svelte, import from `comark-tests/vue`, `comark-tests/react`, or `comark-tests/svelte`. The components add the styles when they mount. Import `comark-tests/style.css` with your styles so a server-rendered page doesn't shift. [Renderers](/guide/renderers/) covers using it with other plugins.

## Theme

Results sit in a bordered card. Each count is a badge tinted in its color, green for passed, red for failed, and muted for skipped, and each failure is a disclosure with its stack. The rules sit in a `comark` CSS layer, so any plain rule of your own wins.

### Shared tokens

The results read these [shared tokens](/guide/theming/):

| Token | Used for |
| --- | --- |
| `--comark-muted` | The duration, and the badge of skipped tests |
| `--comark-background` | The card |
| `--comark-foreground` | The title, mixed into each badge's text |
| `--comark-border` | The card's edge, and the line between failures |
| `--comark-accent` | A hovered failure |
| `--comark-ring` | Focus rings |
| `--comark-radius` | The card's and the badges' corners |
| `--comark-font` | The card's text |

### Variables

Set them on `.ctr`:

| Variable | Default | Used for |
| --- | --- | --- |
| `--ctr-pass` | `#259f56`, `#59d38c` in dark mode | The badge of passed tests |
| `--ctr-fail` | shadcn/ui's `--destructive`, else `#ee3533`, `#fd736d` in dark mode | The badge of failed tests, and failure messages |
| `--ctr-skip` | `--comark-muted` | The badge of skipped tests |

### Classes

| Selector | Is |
| --- | --- |
| `section.ctr` | The block, with `data-status` set to `passed` or `failed` |
| `.ctr-summary` | The line of the title, the counts, and the duration |
| `.ctr-title` | The title |
| `.ctr-count` | A count's badge, with `data-kind` |
| `.ctr-time` | The duration |
| `details.ctr-failure` | A failure, with `.ctr-message` and `pre.ctr-stack` |
