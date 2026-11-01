---
title: Vite Doctor
description: Lint a project's Markdown as part of Vite Doctor, with one code per rule.
install: pnpm add -D comark-linter vite-doctor
---

Add every comark-lint rule to a [Vite Doctor](https://github.com/onmax/vite-doctor) run, so one report covers your code and your documents.

## Setup

### Install the packages

```sh
pnpm add -D comark-linter vite-doctor
```

It needs `vite-doctor` 0.1 or later.

### Register the extension

Vite Doctor loads extensions like `comark-linter/doctor` from an executable config, so register it in `doctor.config.ts`:

```ts
// doctor.config.ts
import comark from "comark-linter/doctor";
import { defineDoctorConfig } from "vite-doctor/config";

export default defineDoctorConfig({
  extends: ["comark/recommended"],
  extensions: [comark({ components: ["duck-count"] })],
});
```

The extension runs once registered, and the `comark/recommended` preset turns every rule on. It works next to Vite Doctor's own presets, such as `extends: ["auto"]`.

### Run it

```sh
pnpm vite-doctor . --config doctor.config.ts
```

It lints `**/*.{md,mdc}`, except `node_modules` and `dist`. Set `include` and `exclude` to change that. Each rule reports with its own code, linked to its page in [Doctor](/doctor/).

## Examples

### Lint this site's pages

This site lints its own pages this way. The config names the components `docs/build.ts` renders itself, and its routes mirror the pages' URLs:

```ts
// doctor.config.ts
export default defineDoctorConfig({
  extends: ["comark/recommended"],
  extensions: [
    comark({
      include: "{docs/pages,packages/*/docs}/**/*.md",
      components: ["demo", "drop", "example", "examples", "hero", "matrix", "packages"],
      links: {
        // A package's pages come from its docs/, the rest from docs/pages, and files from docs/public.
        routes(path) {
          const [first = "", ...rest] = path.split("/").filter(Boolean);
          if (first === "play") return true;
          if (existsSync(`packages/${first}/docs/index.md`))
            return `packages/${first}/docs/${rest.join("/")}`;
          return /\.\w+$/.test(path) ? `docs/public${path}` : `docs/pages${path}`;
        },
      },
    }),
  ],
});
```

### Links and the network

Links resolve from the project root. `comark/dead-url` is marked `env-dependent` because its result depends on the network.

## API

### Options

It takes the same options as the [command line's config](/lint/getting-started/#add-your-own-components), plus two of its own:

| Option | Default | Description |
| --- | --- | --- |
| `include` | `**/*.{md,mdc}` | The Markdown to check, relative to the project root. |
| `exclude` | `**/node_modules/**`, `**/dist/**` | Globs to skip. |

The [library options](/lint/getting-started/#library) list the rest, all but `file`.

### Codes

The core rules' codes start at `COMARK0001`, and each package gets a hundred codes. comark-annotate's start at `COMARK0101`, comark-cards' at `COMARK0201`, and so on.

Of the core rules, unreadable frontmatter and unsafe URLs are errors. So are a few package rules, such as an unsafe card link, a path outside the project root, and a quiz question with no correct option. The rest are warnings. Each rule's page shows its severity, and [Doctor's overview](/doctor/#rules) lists every code.

Each diagnostic has `why`, `fix`, its docs link, and the Markdown location in `sources`. A parsing or rule failure also keeps the original exception in `cause`.
