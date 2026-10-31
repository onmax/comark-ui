# comark-tests

[![npm version](https://comark-ui.onmax.me/badge.svg?source=npm-version&package=comark-tests&icon=npm)](https://npmx.dev/package/comark-tests)
[![npm downloads](https://comark-ui.onmax.me/badge.svg?source=npm-downloads&package=comark-tests&period=month&icon=npm)](https://npmx.dev/package/comark-tests)
[![license](https://comark-ui.onmax.me/badge.svg?label=license&value=MIT)](https://npmx.dev/package/comark-tests)
[![docs](https://comark-ui.onmax.me/badge.svg?label=docs&value=comark-ui.onmax.me)](https://comark-ui.onmax.me/tests/)

Test results from a JUnit XML report: how many tests passed, failed, and were skipped, how long they took, and each failure as a `<details>` with its message and stack. A [Comark](https://comark.dev) plugin for HTML, Vue, React, and Svelte.

```sh
pnpm add comark comark-tests
```

```ts
import { createHtmlRenderer } from "@comark/html";
import tests, { components } from "comark-tests/html";

const render = createHtmlRenderer({ plugins: [tests({ root: "." })], components });
```

````md
::tests{src="reports/junit.xml" title="Unit tests"}
::

::tests
```xml
<testsuite><testcase name="counts the ducks"/></testsuite>
```
::
````

`src` reads the report relative to the document, under `root`, as comark-include does; pass `read` in a browser or an edge runtime. A report can also sit in an ` ```xml ` fence inside the block. Vitest, Jest, pytest, Go, Playwright, and most CI tools write this format. The page shows the counts with no script.

The plugin adds every problem to `meta.issues`, so a host can reject a document before publishing it: a missing `src`, a missing file, a path outside the root, a URL, malformed XML with its line, and a document that isn't a JUnit report. Each issue names the block and says how to fix it.

## Renderers

| Renderer | Import |
| --- | --- |
| `@comark/html` | `comark-tests/html`: the styles are inlined |
| `@comark/vue` | `comark-tests/vue` |
| `@comark/react` | `comark-tests/react` |
| `@comark/svelte` | `comark-tests/svelte` |

Each entry exports the parse plugin as `default` and the renderer's `components`. The Vue, React, and Svelte components add the styles when they mount; import `comark-tests/style.css` with your styles so a server-rendered page doesn't shift. The styles read the shared `--comark-*` tokens and sit in a `comark` CSS layer, so any plain rule of your own wins.
