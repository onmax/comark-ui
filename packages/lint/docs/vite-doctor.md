---
title: Vite Doctor
description: Lint a project's Markdown as part of Vite Doctor, with one code per rule.
install: pnpm add -D comark-linter vite-doctor
---

## Setup

`comark-linter/doctor` is a [Vite Doctor](https://github.com/onmax/vite-doctor) extension. Vite Doctor loads extensions from an executable config, so register it in `doctor.config.ts`:

```ts
// doctor.config.ts
import comark from "comark-linter/doctor";
import { defineDoctorConfig } from "vite-doctor/config";

export default defineDoctorConfig({
  extends: ["comark/recommended"],
  extensions: [comark({ components: ["duck-count"] })],
});
```

```sh
pnpm vite-doctor . --config doctor.config.ts
```

It runs whenever the extension is registered, and the `comark/recommended` preset turns every rule on. It needs `vite-doctor` 0.1 or later.

## Options

It takes the same options as the [command line's config](/lint/getting-started/#command-line), plus two of its own:

| Option | |
| --- | --- |
| `include` | The Markdown to check, relative to the project root. Default `**/*.{md,mdc}`. |
| `exclude` | Globs to skip. Default `**/node_modules/**` and `**/dist/**`. |

Links resolve from the project root, and files are read through Vite Doctor's read-only `ctx.fs`, so its cache knows which files a result depends on. `comark/dead-url` is marked `env-dependent`, since its result depends on the network; the URL cache is still written to `node_modules/.cache/comark-linter/` with node:fs, because `ctx.fs` can't write.

This site lints its own pages this way. Its `docs/build.ts` renders a few components itself, so the config names them, and its routes mirror the pages' URLs:

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

## Codes

Each rule reports with its own code, and the code links to the rule's page in [Doctor](/doctor/). The core rules start at `COMARK0001`, and each package's rules get a hundred codes of their own. comark-annotate's start at `COMARK0101`, comark-cards' at `COMARK0201`, and so on.

Frontmatter Comark can't read and unsafe URLs are errors. The rest are warnings. [Doctor's overview](/doctor/#rules) lists every code.

The extension creates [nostics](https://github.com/vercel-labs/nostics) diagnostics through Vite Doctor's registry. Each one carries `why`, `fix`, its docs link, and the Markdown location in `sources`. A parsing or rule failure also keeps the original exception in `cause`. The library collects these diagnostics without logging them; Vite Doctor reports them once.
