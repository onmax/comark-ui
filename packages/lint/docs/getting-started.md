---
title: Getting started
description: Run comark-linter from the command line, a script, or Vite Doctor.
install: pnpm add -D comark-linter
---

## Command line

```sh
pnpm lint-comark "docs/**/*.md"
pnpm lint-comark ducks-vs-bugs.md --format json
pnpm lint-comark "docs/**/*.md" --check-urls
```

The package is `comark-linter`, since npm refuses `comark-lint` as too close to `remark-lint`. Its command and config file are `lint-comark`.

It checks each file with the plugins and components of every comark-ui package installed. `comark-ui` counts as every package in it. It prints one `file:line:column rule message` line per problem and exits with 1 if there are any, or 2 if a file can't be read. Links resolve from the working directory. `--check-urls` also requests every external URL and reports the dead ones.

Components of your own go in a config, passed with `--config`:

```ts
// lint-comark.config.ts
import { defineConfig } from "comark-linter";
import mermaid from "./mermaid.ts";

export default defineConfig({
  plugins: [mermaid()],
  components: ["duck-count", "pigeon-map"],
});
```

Its `plugins` and `components` are added to the installed packages', and it takes every [library option](#library) but `file`. `components` takes a list of names or the components map you give the renderer. Node loads a `.ts` config from 22.18 on. On older versions, write it as `.mjs`.

## Library

```ts
import { lint } from "comark-linter";
import annotate, { components } from "comark-annotate/html";

const diagnostics = await lint(markdown, { plugins: [annotate()], components });
// [{ rule: "comark/unclosed-block", line: 8, column: 1, message: "…", fix: "…" }]
```

`lint()` never throws. If a rule crashes on a document, that rule reports one diagnostic saying so, and the others still run.

Pass the same plugins and components you render with. Without `components`, `comark/unknown-component` is off, since any name could be valid. HTML elements are always known. `resolveConfig()` returns the installed packages' plugins and components, as the command line uses them.

| Option | |
| --- | --- |
| `plugins` | The parse plugins you render with. Their `meta.issues` become `comark/plugin-issue`. |
| `components` | Your components map, or a list of names. Without it, `comark/unknown-component` is off. |
| `file` | The document's path, absolute or from `root`. Without it, links to files aren't checked. |
| `root` | Where `/` links and the URL cache resolve from. Default the working directory. |
| `read(path)` | Reads a file by absolute path, or returns `undefined`. Default node:fs. |
| `exists(path)` | Whether a file or folder exists. Default node:fs. |
| `list(path)` | The names in a folder, for the "did you mean" of a missing file. Default node:fs. |
| `headingIds` | The `headingIds` you render with, so anchors match the ids readers get. |
| `links` | How links are checked; see [Links](#links). |

`lintFiles(paths, options)` checks many files in one run, as the command line and Vite Doctor do. It reads and parses each file once, shares their headings, so a link from one to another doesn't parse it again, and requests each external URL once. It returns `{ file, text, diagnostics }` for each path, with no `text` when the file can't be read.

```ts
import { lintFiles, resolveConfig } from "comark-linter";

const results = await lintFiles(["docs/index.md", "docs/setup.md"], await resolveConfig());
```

## Links

`links` sets how `comark/broken-link`, `comark/broken-anchor`, `comark/blocked-url`, and `comark/dead-url` read links:

```ts
// lint-comark.config.ts
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

| Option | |
| --- | --- |
| `routes` | Where a link that starts with `/` finds its file. Default: from `root`, as on GitHub. |
| `skip` | Links that skip every check, the built-in block list included. |
| `allow` | When set, every external host it doesn't match is `comark/blocked-url`. |
| `block` | Patterns added to the built-in list of local, private, tunnel, and preview URLs; `false` turns that list off. |
| `urls` | `true`, or the options below, turns on `comark/dead-url`. Off by default. |

Each link goes through them in order: `skip`, then `block` and the built-in list, then `allow`, then the file check for a local link or the request for an external one.

### Routes

A record maps URL prefixes to folders from `root`, one or several; the longest prefix wins. `/blog/first/` above tries `content/blog/first/index.md`, `content/blog/first.md`, and `content/blog/first`, then the same in `content/archive`. A route that resolves to a Markdown file gets its fragments checked too.

A function takes the path and returns the file's path from `root`, which resolves the same way, `true` when the page exists but has no Markdown to check anchors in, such as a generated page, or `undefined` when nothing serves it:

```ts
routes: (path) => (path.startsWith("/api/") ? true : `content${path}`),
```

### Patterns

`skip`, `allow`, and `block` take patterns:

| Pattern | Matches |
| --- | --- |
| `"example.com"` | That host |
| `"*.example.com"` | Its subdomains |
| `"example.com:8080"` | That host on that port |
| `"example.com/docs"` | That host's paths under `/docs` |
| `/regexp/` | The link as written, relative ones included |
| `(url) => boolean` | The URL, resolved against the document for a relative link |

### URL checks

| `urls` option | Default | |
| --- | --- | --- |
| `timeout` | `10_000` | Milliseconds to wait for a response's headers |
| `concurrency` | `8` | Requests at once, at most 2 to one host |
| `retries` | `1` | Retries after a 5xx or a dropped connection |
| `cache` | `"node_modules/.cache/comark-linter/urls.json"` | The cache file from `root`, or `false` |
| `maxAge` | `86_400_000` | Milliseconds a URL that worked stays cached |

When parsing or a rule throws, the result's optional `cause` holds the original exception, including any nested diagnostic. The CLI omits it from JSON because exceptions can contain cycles.

## Vite Doctor

`comark-linter/doctor` is a [Vite Doctor](https://github.com/onmax/vite-doctor) extension. Vite Doctor loads extensions from an executable config, so register it in `doctor.config.ts`:

```ts
// doctor.config.ts
import comark from "comark-linter/doctor";
import { defineDoctorConfig } from "vite-doctor/config";

export default defineDoctorConfig({
  extends: ["auto"],
  extensions: [comark({ components: ["tabs"] })],
});
```

```sh
pnpm vite-doctor . --config doctor.config.ts
```

It lints `**/*.{md,mdc}` except `node_modules` and `dist`. Set `include` and `exclude` to change that. Each rule reports with its own code, linked to its page in [Doctor](/doctor/), and the `comark/recommended` preset turns them all on. It runs whenever the extension is registered, and needs `vite-doctor` 0.1 or later.
