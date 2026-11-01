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

Add the `recommended` config of the `comark-linter/eslint` plugin to `eslint.config.js`:

```js
// eslint.config.js
import comark from "comark-linter/eslint";

export default [comark.configs.recommended];
```

It lints `**/*.md` and `**/*.mdc` with the `markdown/commonmark` language and YAML frontmatter. It turns on every rule but `comark/dead-url`, each at its own severity. Unreadable frontmatter and unsafe URLs are errors, and most of the rest are warnings.

### Run it

```sh
pnpm eslint .
```

ESLint reports each problem at its line and column, under its rule, with the fix after the message. Most rules are warnings, so add `--max-warnings 0` if a warning should fail the run:

```txt
content/review.md
  8:1  warning  `::compare` opened on line 8 is never closed. Add a line with `::` after its last child.  comark/unclosed-block
```

## Examples

### Turn a rule off or up

Each rule has the name its page in [Doctor](/doctor/) gives it. Set it in `rules` after the recommended config:

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

Like the [command line](/lint/getting-started/), the plugin loads every installed comark-ui package. To add your own plugins and components, point `settings.comark.config` at a `comark-lint.config.mjs`:

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

The path resolves from ESLint's working directory, and it's the same file `comark-lint --config` reads. Node imports it without a TypeScript loader. For a `comark-lint.config.ts` with erasable TypeScript syntax, run ESLint on Node 22.18 or later, or enable `--experimental-strip-types` on Node 22.12–22.17. Your editor's ESLint extension needs that Node version too.

Restart ESLint after you edit a config or a module it imports. In VS Code, run **ESLint: Restart ESLint Server**.

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

Some read Comark syntax as plain Markdown. `markdown/no-missing-label-refs`, for example, reports the brackets of a `[text]{.class}` span and a `:badge[text]` component, so turn it off where it misfires.

## oxlint

oxlint can't run this plugin yet. Its JS plugins only lint JavaScript and TypeScript, and it [doesn't support](https://oxc.rs/docs/guide/usage/linter/js-plugins.html) custom file formats or parsers yet, so it never reads a `.md` file. Run `comark-lint` next to it, as the [Guides](/lint/guides/#run-it-next-to-oxlint) show.

## API

### Settings

| Setting | Default | Description |
| --- | --- | --- |
| `settings.comark.config` | — | A `comark-lint.config.mjs`, from the working directory, whose plugins and components add to the installed comark-ui packages'. |

### How it runs

The plugin checks links to other files on disk, relative to the file ESLint lints. A config that fails to load shows as `comark/plugin-issue` on line 1, and ESLint keeps going.
