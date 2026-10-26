# Checking documents

comark-linter reports what Comark forgives, such as a `::` block never closed, a misspelled component, or a link to a missing file. It also reports every problem a plugin puts in `meta.issues`, each under its own rule. Check the result in SKILL.md runs it on one file; this page covers its flags, its config file, the library, ESLint, and Vite Doctor.

## Run the command

```sh
npx lint-comark "docs/**/*.md" --format json --check-urls
```

- Pass files or globs. Quote a glob so the shell passes it as written; lint-comark expands it and skips `node_modules` and `dist`.
- It prints `file:line:column rule message fix` for each problem, or `No problems.` when there are none. It exits with 0 when clean, 1 on any problem, and 2 when a file can't be read, a glob matches nothing, or the config fails to load.
- `--format json` prints an array of `{ file, rule, line, column, message, fix }` instead.
- `--check-urls` also requests every external URL, and reports one that answers 404 or 410, has no DNS record, or fails its TLS check. It caches answers for a day in `node_modules/.cache/comark-linter/urls.json`, except a 404, 410, 429, or 5xx, which it requests again on the next run.
- `--config lint-comark.config.ts` loads a config. The command finds none on its own.

Run it from the project root. A relative link or image resolves from the document's folder, and a `/` path from the working directory. Each must point at a file that exists, so save the screenshots before you lint.

It lints with every comark-ui package installed, `comark-ui` first; the [comark-ui reference](ui.md) says what it turns on there. Besides each plugin's own rules, named `comark/<package>/<kind>`, it reports unclosed blocks, unknown components, an unclosed `{` or a key set twice, broken links and anchors, frontmatter that isn't valid YAML, `javascript:` and other unsafe URLs, duplicate ids, images without alt text unless `{alt=""}` marks them as decoration, and empty links. It also reports links that stop working for other readers: localhost, private network, and `file:` URLs, tunnels such as ngrok, and Vercel or Netlify deploy previews. In PR evidence, link the production page or the pull request, and write a local address as code, such as `` `localhost:3000` ``, since Comark links a bare URL.

## Config file

```ts
// lint-comark.config.ts
import { defineConfig } from "comark-linter";
import include from "comark-include";

export default defineConfig({
  plugins: [include({ root: "content" })],
  components: ["duck-count"],
  links: { routes: { "/": "content" }, skip: ["staging.example.com"] },
});
```

- `plugins` and `components` add to those of the installed packages. `components` takes names, or the components map you render with. Comark keeps the first plugin of each name and drops the rest, so a config can add plugins, such as your own or [include](include.md), and can't change the options of one an installed package registers.
- It takes every library option below except `file`. Node reads a `.ts` config from 22.18 on; on older versions, write it as `.mjs`.

`links` sets how the linter checks links. It applies `skip`, `block`, and `allow` in that order, then checks the file or the URL:

| Option | What it does |
| --- | --- |
| `skip` | Links that skip every check, the built-in block list included. |
| `block` | Patterns added to the built-in list of local, private, tunnel, and preview URLs. `false` turns that list off. |
| `allow` | When set, the linter blocks a link to any external host it doesn't match. |
| `routes` | Where a `/` link finds its file. A record maps URL prefixes to folders from `root`, and the longest prefix wins. A function gets the path and returns the file's path from `root`, `true` for a page with no Markdown to check, or `undefined` when nothing serves it. By default, a `/` link resolves from `root`, as on GitHub. |
| `urls` | `true`, or these options, does what `--check-urls` does: `timeout` (10000 ms), `concurrency` (8, at most 2 to one host), `retries` (1), `cache` (the file above, or `false`), and `maxAge` (one day, in ms). |

A pattern is a host (`example.com`), its subdomains (`*.example.com`), a host with a port or a path (`example.com:8080`, `example.com/docs`), a RegExp tested against the link as written, or a function that gets the resolved `URL`.

## Library

```ts
import { lint, lintFiles, resolveConfig } from "comark-linter";
import annotate, { components } from "comark-annotate/html";

const diagnostics = await lint(markdown, { plugins: [annotate()], components, file: "docs/review.md" });
const results = await lintFiles(["docs/index.md", "docs/setup.md"], await resolveConfig());
```

- `lint(markdown, options)` returns `{ rule, line, column?, message, fix }[]` in source order and never throws. A rule that crashes reports one diagnostic saying so, and the others still run.
- Pass `plugins` and `components`, the ones you render with; without `components`, it skips the unknown-component check. Pass `file`, the document's path, to check its links to files. `root` defaults to the working directory, and `read`, `exists`, and `list` replace node:fs, by absolute path. Pass `headingIds` if you render with it, so anchors match, and `links` as above.
- `lintFiles(paths, options)` parses each file once, checks links between them against each other's headings, and requests each URL once. It returns `{ file, text, diagnostics }` for each path, with no `text` when the file can't be read.
- `resolveConfig(config)` returns the installed packages' plugins and components plus the config's, as the command uses them. `rules` maps every rule to its title.

## ESLint

```js
// eslint.config.js
import comark from "comark-linter/eslint";

export default [comark.configs.recommended, { settings: { comark: { config: "lint-comark.config.mjs" } } }];
```

Use a JavaScript ES module (`export default { ... }`) for the linter config across supported Node versions. A `.ts` config requires Node 22.18+ or `--experimental-strip-types` on Node 22.12–22.17, including in the editor. Restart ESLint after editing the config or its imports; they are cached for the process lifetime.

Install `eslint` (9.15 or later) and `@eslint/markdown` (8 or later). The recommended config lints `**/*.md` and `**/*.mdc` with `@eslint/markdown`'s `markdown/commonmark` language and YAML frontmatter, and turns on every rule but `comark/dead-url`, which requests every URL; turn that one on in `rules` to check them. Each rule has the name the command prints and is configured like any ESLint rule, `<!-- eslint-disable-next-line comark/unknown-component -->` included. ESLint prints the fix after the message. `settings.comark.config`, from the working directory, loads the same config file as `--config`. oxlint can't run it: its JS plugins don't lint `.md` files, so run `lint-comark` beside `oxlint`.

## Vite Doctor

```ts
// doctor.config.ts
import comark from "comark-linter/doctor";
import { defineDoctorConfig } from "vite-doctor/config";

export default defineDoctorConfig({
  extends: ["comark/recommended"],
  extensions: [comark({ include: "content/**/*.md" })],
});
```

Run `vite-doctor . --config doctor.config.ts --max-warnings 0`. The extension takes the config file's options plus `include` (default `**/*.{md,mdc}`) and `exclude` (default `node_modules` and `dist`), and needs vite-doctor 0.1 or later. Each rule reports under its own code, from `COMARK0001` for the core rules and a hundred per package. Unsafe URLs, invalid frontmatter, and paths that leave a plugin's `root` are errors; the rest are warnings, which Vite Doctor passes unless you add `--max-warnings 0`.

## Register

- In `comark-ui`: not included. Install it beside the preset, which it finds on its own.
- Alone: `pnpm add -D comark-linter`. The command is `lint-comark`, the library `comark-linter`, the ESLint plugin `comark-linter/eslint`, and the extension `comark-linter/doctor`. npm refused `comark-lint` as too close to `remark-lint`, hence the name.
