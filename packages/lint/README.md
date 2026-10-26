# comark-linter

[![npm version](https://npmx.dev/api/registry/badge/version/comark-linter)](https://npmx.dev/package/comark-linter)
[![npm downloads](https://npmx.dev/api/registry/badge/downloads-month/comark-linter)](https://npmx.dev/package/comark-linter)
[![install size](https://npmx.dev/api/registry/badge/size/comark-linter)](https://npmx.dev/package/comark-linter)
[![license](https://npmx.dev/api/registry/badge/license/comark-linter)](https://npmx.dev/package/comark-linter)
[![docs](https://img.shields.io/badge/docs-comark--ui.onmax.me-14b8a6?labelColor=0a0a0a)](https://comark-ui.onmax.me/lint/)

Finds unclosed blocks, unknown components, broken links and anchors, local URLs, and plugin issues in [Comark](https://comark.dev) documents. A library, a CLI, an [ESLint](https://eslint.org) plugin, and a [Vite Doctor](https://github.com/onmax/vite-doctor) extension. Every message names the block and says how to fix it.

```sh
pnpm add -D comark-linter
pnpm lint-comark "docs/**/*.md"
```

The package is `comark-linter`, since npm refuses `comark-lint` as too close to `remark-lint`. Its command and config file are `lint-comark`.

```txt
docs/pigeons-vs-deploys.md:8:1 comark/unclosed-block `::compare` opened on line 8 is never closed. Add a line with `::` after its last child.
```

The CLI checks each file with every comark-ui package installed, `comark-ui` included, prints `file:line:column rule message`, or JSON with `--format json`, and exits with 1 on any problem. Add your own plugins and component names with `--config lint-comark.config.ts`, which exports `defineConfig({ plugins, components, links })`. `--check-urls` also requests every external URL and reports the dead ones.

```ts
import { lint } from "comark-linter";
import annotate, { components } from "comark-annotate/html";

const diagnostics = await lint(markdown, { plugins: [annotate()], components });
```

`lint()` never throws and returns `{ rule, line, column?, message, fix, cause? }[]`. When parsing or a rule throws, `cause` holds the original exception. The CLI omits `cause` from JSON. Without `components`, unknown components aren't reported, and without `file`, links to other files aren't checked. `lintFiles(paths, options)` checks many files in one run, as the CLI does.

For ESLint 9.15 or later, install `eslint` and `@eslint/markdown` and add the recommended config to `eslint.config.js`. It lints `.md` and `.mdc` files with every rule but `comark/dead-url`, each one configurable like any ESLint rule, and `settings.comark.config` points at a `lint-comark.config.ts`:

```js
import comark from "comark-linter/eslint";

export default [comark.configs.recommended];
```

oxlint can't run it yet: its JS plugins lint JavaScript and TypeScript only, so run `lint-comark` next to `oxlint`.

For Vite Doctor 0.1 or later, register the extension in `doctor.config.ts` and run `vite-doctor . --config doctor.config.ts`:

```ts
import comark from "comark-linter/doctor";
import { defineDoctorConfig } from "vite-doctor/config";

export default defineDoctorConfig({ extends: ["auto"], extensions: [comark()] });
```

| Rule | Code | Reports |
| --- | --- | --- |
| `comark/unclosed-block` | `COMARK0001` | A `::` block that is never closed |
| `comark/unknown-component` | `COMARK0002` | A component that isn't in your components or HTML |
| `comark/malformed-attributes` | `COMARK0003` | An unclosed `{`, or a key set twice |
| `comark/broken-anchor` | `COMARK0004` | A `#fragment` that matches no heading or id, in this document or the one it links |
| `comark/invalid-frontmatter` | `COMARK0005` | Frontmatter that isn't valid YAML |
| `comark/plugin-issue` | `COMARK0006` | A plugin's problem that names no rule of its own |
| `comark/unsafe-url` | `COMARK0007` | A `javascript:`, `vbscript:`, or non-image `data:` URL |
| `comark/duplicate-id` | `COMARK0008` | An id two elements share |
| `comark/missing-alt` | `COMARK0009` | An image without alt text |
| `comark/empty-link` | `COMARK0010` | A link without text |
| `comark/broken-link` | `COMARK0011` | A link or image to a file that doesn't exist |
| `comark/blocked-url` | `COMARK0012` | A localhost, private, tunnel, or deploy preview URL |
| `comark/dead-url` | `COMARK0013` | An external URL that answers 404 or 410, or whose host is gone, with `--check-urls` |

Each comark-ui package adds one rule per kind of problem its plugin reports, named in `meta.issueRules`, with a code in its own hundred. [Doctor](https://comark-ui.onmax.me/doctor/) has a page for every rule.

Comark gives parsed nodes no positions, so block components take their line from the parser's tokens and everything else is found by searching the source.
