# comark-ui

[![npm version](https://npmx.dev/api/registry/badge/version/comark-ui)](https://npmx.dev/package/comark-ui)
[![npm downloads](https://npmx.dev/api/registry/badge/downloads-month/comark-ui)](https://npmx.dev/package/comark-ui)
[![license](https://npmx.dev/api/registry/badge/license/comark-ui)](https://npmx.dev/package/comark-ui)
[![docs](https://img.shields.io/badge/docs-comark--ui.onmax.me-14b8a6?labelColor=0a0a0a)](https://comark-ui.onmax.me/getting-started/)

Every [Comark](https://comark.dev) block from [comark-ui](https://comark-ui.onmax.me) in one install, registered in the order they need, with one icon resolver shared by `:icon`, cards, details, file trees, tabs, and code actions. It ships in lockstep with the plugins, so updating it brings their latest defaults.

```sh
pnpm add comark @comark/html comark-ui
```

```ts
import { createHtmlRenderer } from "@comark/html";
import comarkUi from "comark-ui/html";

const render = createHtmlRenderer(comarkUi());
```

`comarkUi()` returns `{ plugins, components }`. Every plugin is on but `include`. Pass `false` to turn one off, which drops its components too, or an object to pass it options:

```ts
comarkUi({
  zoom: false,
  code: { actions: [{ id: "run", label: "Run" }] },
  github: { references: { repo: "owner/name" } },
  include: { root: "content" },
});
```

`include` is off because it reads files from disk; turn it on to paste files into a document. `cast`, `table`, and `tests` are on but read no files until you pass `{ root }` or `{ read }`. When you parse in a browser, pass `chips: { download: false }`, since a browser may not download another site's images. comark-critic has no component for its styles, so put the exported `criticCss` in the page.

## Renderers

| Renderer | Import |
| --- | --- |
| `@comark/html` | `comark-ui/html` |
| `@comark/vue` | `comark-ui/vue` |
| `@comark/react` | `comark-ui/react` |
| `@comark/svelte` | `comark-ui/svelte` |

Vue, React, and Svelte leave out annotate and diff, which render only to HTML.

## Agents

The package ships the [comark-ui agent skill](https://github.com/onmax/comark-ui/tree/main/skills/comark-ui): a `SKILL.md` that says how to install the plugins, which block shows what, and how to check the result, and a reference for each package. Install it with `npx skills add onmax/comark-ui`, or bundle it in your own app from `comark-ui/skills/comark-ui/`, which always matches the plugins it installed.

## Linting

[comark-linter](https://comark-ui.onmax.me/lint/) finds `comark-ui` when it's installed and checks documents with its plugins and components.

## License

MIT
