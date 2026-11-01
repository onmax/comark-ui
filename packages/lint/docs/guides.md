---
title: Guides
description: Run comark-lint from ESLint or next to oxlint, on staged files and in CI, or all of it as one Vite Doctor run.
---

Add comark-lint to the scripts, hooks, and CI jobs that already check your code.

## With your linter

### Run it from ESLint

`comark-linter/eslint` turns every comark-lint rule into an ESLint rule, so `eslint .` and your editor report broken documents next to broken code:

```js
// eslint.config.js
import comark from "comark-linter/eslint";

export default [comark.configs.recommended];
```

[ESLint](/lint/eslint/) has the setup and the rules' settings.

### Run it next to oxlint

oxlint's JS plugins don't read `.md` files yet, so run comark-lint in the same script instead of from oxlint's config:

```sh
pnpm add -D comark-linter
```

```json
{
  "scripts": {
    "lint": "oxlint && comark-lint \"content/**/*.md\""
  }
}
```

Quote the glob so comark-lint expands it, not the shell. It skips `node_modules` and `dist`. `pnpm lint` now fails on a broken document as it does on a lint error in code:

```txt
content/review.md:8:1 comark/unclosed-block `::compare` opened on line 8 is never closed. Add a line with `::` after its last child.
```

### Lint staged files

With [lint-staged](https://github.com/lint-staged/lint-staged), each tool gets the staged files it understands. comark-lint takes file paths as well as globs:

```json
{
  "lint-staged": {
    "*.{js,ts,vue}": "oxlint --fix",
    "*.{md,mdc}": "comark-lint"
  }
}
```

With the ESLint plugin, `"*.{js,ts,vue,md,mdc}": "eslint"` covers both.

## In CI

### Fail the build on a broken document

`pnpm lint` exits with 1 on any problem, so a CI job needs only one step for both:

```yaml
- run: pnpm install --frozen-lockfile
- run: pnpm lint
```

### Check your app and your documents in one run

In a Vite, Vue, Nuxt, or Nitro app, [Vite Doctor](https://github.com/onmax/vite-doctor) can run comark-lint for you. It catches framework mistakes your linter can't, such as a raw `fetch` in a Nuxt `setup` or a secret in Vite's `define`. `comark-linter/doctor` adds every comark-lint rule to that run:

```sh
pnpm add -D comark-linter vite-doctor
```

```ts
// doctor.config.ts
import comark from "comark-linter/doctor";
import { defineDoctorConfig } from "vite-doctor/config";

export default defineDoctorConfig({
  extends: ["auto", "comark/recommended"],
  extensions: [comark({ include: "content/**/*.md" })],
});
```

```json
{
  "scripts": {
    "lint": "eslint . && vite-doctor . --config doctor.config.ts --max-warnings 0"
  }
}
```

One report covers code and documents. Each comark-lint problem has a code linked to its rule's page in [Doctor](/doctor/).

> [!NOTE]
> Vite Doctor exits with 0 on warnings alone, and most comark-lint rules are warnings. `--max-warnings 0` makes them fail the script.

In a coding agent's terminal, Vite Doctor prints a compact report with the fix for each problem.

### Annotate a pull request

Pass `--format sarif` to Vite Doctor for a file GitHub code scanning uses to annotate the pull request. [Vite Doctor](/lint/vite-doctor/) lists the options.

## Next steps

- [Getting started](/lint/getting-started/) lists every command-line flag and option.
- [Doctor](/doctor/) has a page for every rule.
