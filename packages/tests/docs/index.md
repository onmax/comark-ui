---
title: Tests
description: Test results in Markdown, read from a JUnit report.
keywords: JUnit, test report, test results, Vitest, Jest, Playwright, pytest, CI, XML, failures, stack trace
tagline: Point a block at the JUnit XML your test runner writes and get how many tests passed, failed, and were skipped, how long they took, and every failure with its stack.
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

A pull request that says the tests pass reads better with the run next to it. The plugin reads the report while parsing, so the page shows the counts with no script, and each failure opens to its message and stack.

## Usage

### From a file

```md
::tests{src="reports/junit.xml" title="Unit tests"}
::
```

`src` is a path relative to the document's folder, or to `root` when it starts with `/`. It can't leave `root` or be a URL.

### From a fence

Paste the report into an ` ```xml ` fence inside the block:

````md
::tests
```xml
<testsuite><testcase name="counts the ducks"/></testsuite>
```
::
````

### Props

| Prop | What it does |
| --- | --- |
| `src` | The JUnit XML file to read. |
| `title` | Shown before the counts, and names the results for screen readers. |

### What it shows

- **Passed, failed, and skipped.** Counted from the `<testcase>` elements, so the totals always match the cases. A case with `<failure>` or `<error>` failed, and one with `<skipped>` was skipped. Failed and skipped show only when there are any.
- **Duration.** The `time` of `<testsuites>`, else the sum of the suites', else the sum of the cases', as `250 ms`, `4.2 s`, or `1 min 21 s`.
- **Failures.** Each one is a `<details>` named `classname › name`, with the failure's `message` and its stack in a code block. With [comark-code](/code/), the stack gets a Copy button.

The root can be `<testsuites>` or a single `<testsuite>`.

### Issues

The plugin adds every problem to `meta.issues`, as [Validation](/guide/validation/) describes: a missing `src`, a prop it doesn't read, a file that's missing, outside the root, or a URL, XML that isn't well-formed (with the line), and a document that isn't a JUnit report. The block renders nothing then. Each issue names the block and says how to fix it, and each has its own rule in [Doctor](/doctor/):

```txt
`::tests` 1 ("junit.xml"): its XML is malformed at line 3: `</testsuite>` closes `<testcase>`. Fix the report, or run the tests again to rewrite it.
`::tests` 2: it isn't a JUnit report: its root is `<coverage>`, not `<testsuites>` or `<testsuite>`.
```

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

### The XML parser

JUnit XML uses a small part of XML: elements, attributes, text, CDATA, and the five entities. The plugin reads it with a parser of its own, about a hundred lines with no dependency, rather than pulling in a general XML library many times its size. It refuses what isn't well-formed and says on which line, and it skips doctypes without reading them, so a report can't make it load anything.

## API

These options go under `tests` in `comarkUi()`, or to `tests()` when you use the plugin alone. In `comarkUi()`, a `::tests` block reads no files until you pass options, such as `comarkUi({ tests: { root: "." } })`.

`root` is the folder `src` can't leave, and `base` the document's folder under it, as in [comark-include](/include/). In a browser or an edge runtime, pass `read`, a function that takes a path under the root and returns the file's text.

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

The renderer inlines the styles once per document, and the output needs no script. For Vue, React, or Svelte, import from `comark-tests/vue`, `comark-tests/react`, or `comark-tests/svelte`; the components add the styles when they mount. Import `comark-tests/style.css` with your styles so a server-rendered page doesn't shift. [Renderers](/guide/renderers/) covers using it with other plugins.

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

The block is `section.ctr`, with `data-status` set to `passed` or `failed`. The parts are `.ctr-summary`, `.ctr-title`, `.ctr-count` with `data-kind`, `.ctr-time`, and each `details.ctr-failure` with `.ctr-message` and `pre.ctr-stack`.
