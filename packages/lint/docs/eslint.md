---
title: ESLint
description: Lint your Comark Markdown with ESLint, with every comark-lint rule as an ESLint rule.
install: pnpm add -D comark-linter eslint @eslint/markdown
---

Run every comark-lint rule from ESLint, so `eslint .`, your editor, and your CI report broken documents next to broken code.

## Setup

### Install the packages

```sh
pnpm add -D comark-linter eslint @eslint/markdown
```

It needs ESLint 9.15 or later and `@eslint/markdown` 8 or later, which parses the Markdown.

### Add the config

`comark-linter/eslint` is an ESLint plugin. Add its `recommended` config to `eslint.config.js`:

```js
// eslint.config.js
import comark from "comark-linter/eslint";

export default [comark.configs.recommended];
```

It lints `**/*.md` and `**/*.mdc` with the `markdown/commonmark` language and YAML frontmatter, and turns every rule on but `comark/dead-url`. Each rule keeps its severity: frontmatter Comark can't read and unsafe URLs are errors, and most of the rest are warnings.

### Run it

```sh
pnpm eslint .
```

Each problem is reported at its line and column, under its rule, with the fix after the message. Most rules are warnings, so add `--max-warnings 0` where a warning should fail the run:

```txt
content/review.md
  8:1  warning  `::compare` opened on line 8 is never closed. Add a line with `::` after its last child.  comark/unclosed-block
```

## Examples

### Turn a rule off or up

Every rule is an ESLint rule, named as on its page in [Doctor](/doctor/). Set it in `rules` after the recommended config:

```js
// eslint.config.js
import comark from "comark-linter/eslint";

export default [
  comark.configs.recommended,
  {
    files: ["**/*.md"],
    rules: {
      "comark/missing-alt": "error",
      "comark/embed/insecure-url": "off",
    },
  },
];
```

Turn one off for a single line with a comment above it:

```md
<!-- eslint-disable-next-line comark/unknown-component -->
::duck-count
::
```

### Add your own components

The plugin loads every comark-ui package you have installed, as the [command line](/lint/getting-started/) does. Point `settings.comark.config` at a `comark-lint.config.mjs` to add your own plugins and components:

```js
// eslint.config.js
import comark from "comark-linter/eslint";

export default [
  comark.configs.recommended,
  { settings: { comark: { config: "comark-lint.config.mjs" } } },
];
```

Create the config as a JavaScript ES module:

```js
// comark-lint.config.mjs
export default { components: ["duck-count"] };
```

The path resolves from ESLint's working directory, and the file is the one `comark-lint --config` reads. `.mjs` works across the package's supported Node versions. Configs are imported by Node without a TypeScript loader: to use `comark-lint.config.ts` with erasable TypeScript syntax, run ESLint on Node 22.18 or later, or enable `--experimental-strip-types` on Node 22.12–22.17. The same requirement applies to the Node runtime used by your editor's ESLint extension.

Configs and their imports are cached for the lifetime of the ESLint process. After editing a config or a module it imports, restart ESLint (in VS Code, run **ESLint: Restart ESLint Server**) to load the changes.

### Check external URLs

`comark/dead-url` requests every external URL, so it's off in the recommended config. Turn it on in CI, where waiting for the network is fine:

```js
{ files: ["**/*.md"], rules: { "comark/dead-url": "warn" } }
```

### Keep `@eslint/markdown`'s rules

The recommended config registers the `markdown` plugin it parses with, so its rules can run on the same files:

```js
// eslint.config.js
import markdown from "@eslint/markdown";
import comark from "comark-linter/eslint";

export default [
  comark.configs.recommended,
  { files: ["**/*.md"], rules: markdown.configs.recommended[0].rules },
];
```

Some of them read Comark syntax as plain Markdown. `markdown/no-missing-label-refs`, for example, reports the brackets of a `[text]{.class}` span and a `:badge[text]` component, so turn it off where it misfires.

## oxlint

oxlint can't run this plugin yet. Its JS plugins lint JavaScript and TypeScript files only, and custom file formats and parsers are [not supported yet](https://oxc.rs/docs/guide/usage/linter/js-plugins.html), so it never reads a `.md` file. Run `comark-lint` next to it, as the [Guides](/lint/guides/#run-it-next-to-oxlint) show.

## API

### Settings

| Setting | Default | Description |
| --- | --- | --- |
| `settings.comark.config` | — | A `comark-lint.config.mjs`, from the working directory, whose plugins and components are added to the installed comark-ui packages. |

### How it runs

ESLint rules are synchronous, and comark-lint's parse plugins aren't. The plugin lints each file once in a worker thread and waits for the result, which every rule then reads. Links to other files are checked against the disk, from the file ESLint lints. A config that fails to load is reported as `comark/plugin-issue` on line 1, and ESLint keeps going.
