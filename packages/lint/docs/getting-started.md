---
title: Getting started
description: Run comark-linter from the command line, a script, ESLint, or Vite Doctor.
install: pnpm add -D comark-linter
---

Install comark-lint, run it on your documents, and teach it your own components.

## Installation

### Install the package

```sh
pnpm add -D comark-linter
```

The package is `comark-linter`, since npm refuses `comark-lint` as too close to `remark-lint`. Its command and config file are `comark-lint`. The command is also installed as `lint-comark`, and a `lint-comark.config.ts` still loads.

### Run it

Pass files or globs. Quote a glob so the shell passes it as it is.

```sh
pnpm comark-lint "docs/**/*.md"
pnpm comark-lint ducks-vs-bugs.md --format json
pnpm comark-lint "docs/**/*.md" --check-urls
```

It checks each file with the plugins and components of every comark-ui package installed. `comark-ui` counts as every package in it. It prints one `file:line:column rule message fix` line per problem, and `No problems.` when there are none. Links resolve from the working directory. `--check-urls` also requests every external URL and reports the dead ones.

### Add your own components

Put components and plugins of your own in a `comark-lint.config.ts` in the working directory:

```ts
// comark-lint.config.ts
import { defineConfig } from "comark-linter";
import mermaid from "./mermaid.ts";

export default defineConfig({
  plugins: [mermaid()],
  components: ["duck-count", "pigeon-map"],
});
```

The command loads it, or a `.mts`, `.mjs`, or `.js` one, when you run it from that directory. Pass a config elsewhere with `--config`:

```sh
pnpm comark-lint "docs/**/*.md" --config config/comark-lint.config.ts
```

Its `plugins` and `components` are added to the installed packages'. It takes every [library option](#library) but `file`.

> [!NOTE]
> Node loads a `.ts` config from 22.18 on. On older versions, write it as `.mjs`.

### Lint from a script

Call `lint()` with the same plugins and components you render with:

```ts
import { lint } from "comark-linter";
import annotate, { components } from "comark-annotate/html";

const diagnostics = await lint(markdown, { plugins: [annotate()], components });
// [{ rule: "comark/unclosed-block", severity: "warn", line: 8, column: 1, message: "…", fix: "…" }]
```

Each diagnostic carries its rule's `severity`, `error` or `warn`, the same one Vite Doctor and ESLint report, so a script can fail on errors alone:

```ts
if (diagnostics.some((diagnostic) => diagnostic.severity === "error")) process.exitCode = 1;
```

`lint()` never throws. If a rule crashes on a document, that rule reports one diagnostic saying so, and the others still run.

### Add it to ESLint

Add `comark-linter/eslint`'s recommended config to `eslint.config.js` to lint your Markdown with `eslint .` and in your editor. [ESLint](/lint/eslint/) has the setup.

### Add it to Vite Doctor

Register `comark-linter/doctor` in `doctor.config.ts` to lint your Markdown in the same run as your code. [Vite Doctor](/lint/vite-doctor/) has the setup.

## API

### Command line

```sh
comark-lint <file or glob>... [--format text|json] [--config comark-lint.config.ts] [--check-urls]
```

| Option | Default | Description |
| --- | --- | --- |
| `--format` | `text` | `text` prints one line per problem. `json` prints the problems as an array, each with its `file`. |
| `--config`, `-c` | `comark-lint.config.ts` in the working directory | A config file whose default export is a `defineConfig()` object. |
| `--check-urls` | Off | Requests every external URL and reports the dead ones as `comark/dead-url`. |
| `--help`, `-h` | — | Prints the usage. |

A glob skips `node_modules` and `dist`.

| Exit code | When |
| --- | --- |
| `0` | No problems |
| `1` | At least one problem |
| `2` | A file can't be read, a glob matches no files, the config can't load, or no files or an unknown `--format` were given |

### Library

`lint(markdown, options)` checks one document and returns its diagnostics, sorted by position.

| Option | Default | Description |
| --- | --- | --- |
| `plugins` | `[]` | The parse plugins you render with. Their `meta.issues` become `comark/plugin-issue`, unless a plugin names their rule. |
| `components` | — | Your components map, or a list of names. Without it, `comark/unknown-component` is off, since any name could be valid. HTML elements are always known. |
| `file` | — | The document's path, absolute or from `root`. Without it, links to files aren't checked. |
| `root` | The working directory | Where `/` links and the URL cache resolve from. |
| `read(path)` | node:fs | Reads a file by absolute path, or returns `undefined`. |
| `exists(path)` | node:fs | Whether a file or folder exists. |
| `list(path)` | node:fs | The names in a folder, for the "did you mean" of a missing file. |
| `headingIds` | Comark's | The `headingIds` you render with, so anchors match the ids readers get. |
| `links` | — | How links are checked. See [Links](#links). |

`lintFiles(paths, options)` checks many files in one run, as the command line and Vite Doctor do. It reads and parses each file once and shares their headings, so a link from one to another doesn't parse it again. It requests each external URL once. It returns `{ file, text, diagnostics }` for each path, with no `text` when the file can't be read.

```ts
import { lintFiles, resolveConfig } from "comark-linter";

const results = await lintFiles(["docs/index.md", "docs/setup.md"], await resolveConfig());
```

`resolveConfig(config)` returns the installed packages' plugins and components, plus `config`'s, as the command line uses them.

### Links

`links` sets how `comark/broken-link`, `comark/broken-anchor`, `comark/blocked-url`, and `comark/dead-url` read links:

```ts
// comark-lint.config.ts
import { defineConfig } from "comark-linter";

export default defineConfig({
  links: {
    routes: { "/": "content", "/blog": ["content/blog", "content/archive"] },
    skip: ["staging.example.com", /^https:\/\/twitter\.com\//],
    block: ["*.corp.example.com"],
    urls: { timeout: 5_000 },
  },
});
```

| Option | Default | Description |
| --- | --- | --- |
| `routes` | From `root`, as on GitHub | Where a link that starts with `/` finds its file. See [Routes](#routes). |
| `skip` | — | Links that skip every check, the built-in block list included. |
| `allow` | — | When set, every external host it doesn't match is `comark/blocked-url`. |
| `block` | The built-in list | Patterns added to the built-in list of local, private, tunnel, and preview URLs. `false` turns that list off. |
| `urls` | Off | `true`, or the [URL options](#url-checks), turns on `comark/dead-url`. |

Each link goes through them in order: `skip`, then `block` and the built-in list, then `allow`. Then a local link gets the file check, and an external one the request.

#### Routes

A record maps URL prefixes to folders from `root`, one or several. The longest prefix wins. `/blog/first/` above tries `content/blog/first/index.md`, `content/blog/first.md`, and `content/blog/first`, then the same in `content/archive`. A route that resolves to a Markdown file gets its fragments checked too.

A function takes the path and returns one of these:

- the file's path from `root`, which resolves the same way
- `true` when the page exists but has no Markdown to check anchors in, such as a generated page
- `undefined` when nothing serves it

```ts
routes: (path) => (path.startsWith("/api/") ? true : `content${path}`),
```

#### Patterns

`skip`, `allow`, and `block` take patterns:

| Pattern | Matches |
| --- | --- |
| `"example.com"` | That host |
| `"*.example.com"` | Its subdomains |
| `"example.com:8080"` | That host on that port |
| `"example.com/docs"` | That host's paths under `/docs` |
| `/regexp/` | The link as written, relative ones included |
| `(url) => boolean` | The URL, resolved against the document for a relative link |

#### URL checks

| Option | Default | Description |
| --- | --- | --- |
| `timeout` | `10_000` | Milliseconds to wait for a response's headers. |
| `concurrency` | `8` | Requests at once, at most 2 to one host. |
| `retries` | `1` | Retries after a 5xx or a dropped connection. |
| `cache` | `"node_modules/.cache/comark-linter/urls.json"` | The cache file from `root`, or `false`. |
| `maxAge` | `86_400_000` | Milliseconds a URL that worked stays cached. |

When parsing or a rule throws, the result's optional `cause` holds the original exception, including any nested diagnostic. The CLI omits it from JSON because exceptions can contain cycles.

## Next steps

- [ESLint](/lint/eslint/) runs every rule as an ESLint rule.
- [Vite Doctor](/lint/vite-doctor/) runs every rule in the same report as your code.
- [Guides](/lint/guides/) add lint-comark to your lint script, staged files, and CI.
- [Doctor](/doctor/) has a page for every rule.
