# comark-ui

[![npm version](https://comark-ui.onmax.me/badge.svg?source=npm-version&package=comark-ui&icon=npm)](https://npmx.dev/package/comark-ui)
[![npm downloads](https://comark-ui.onmax.me/badge.svg?source=npm-downloads&package=comark-ui&period=month&icon=npm)](https://npmx.dev/package/comark-ui)
[![license](https://comark-ui.onmax.me/badge.svg?label=license&value=MIT)](https://npmx.dev/package/comark-ui)
[![docs](https://comark-ui.onmax.me/badge.svg?label=docs&value=comark-ui.onmax.me)](https://comark-ui.onmax.me/getting-started/)

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

`include` is off because it reads files from disk; turn it on to paste files into a document. `cast`, `table`, and `tests` are on but read no files until you pass `{ root }` or `{ read }`. When you parse in a browser, pass `chips: { download: false }`, since a browser may not download another site's images. comark-critic has no component for its styles, so put the exported `criticCss` in the page. The text around the blocks (headings, paragraphs, lists, tables, code, and quotes) is styled too, from shadcn/typeset on the same tokens and scoped to the document; pass `typeset: false` when your site already styles Markdown. See [Typeset](https://comark-ui.onmax.me/guide/typeset/).

## Renderers

| Renderer | Import |
| --- | --- |
| `@comark/html` | `comark-ui/html` |
| `@comark/vue` | `comark-ui/vue` |
| `@comark/react` | `comark-ui/react` |
| `@comark/svelte` | `comark-ui/svelte` |

Vue, React, and Svelte leave out annotate and diff, which render only to HTML.

## Editor

[Editor docs](https://comark-ui.onmax.me/guide/editor/) cover setup, Vue bindings, file uploads, and collaborative rooms.

`comark-ui/editor` is a [Tiptap](https://tiptap.dev) editor for Comark Markdown, with no DOM and no framework, so a server can convert documents with it too. Install `@tiptap/core`, `@tiptap/pm`, `@tiptap/starter-kit`, `@tiptap/extension-list`, `@tiptap/extension-image`, and `@tiptap/extension-table`.

| Export | What it does |
| --- | --- |
| `ComarkKit` | The schema: StarterKit, task lists, inline images (drawn as players for video and audio), tables, and Comark's components, slots, and comments, each keeping the attributes it has no field for. |
| `fromMarkdown`, `toMarkdown` | Convert between Markdown and the editor's JSON with Comark's own parser and writer. Front matter stays beside the document. |
| `checkMarkdown(markdown, { plugins })` | Whether the editor can save the document without changing what readers see, judged with the plugins the page renders with. A document it can't keep opens read-only. |
| `Upload` | Uploads pasted and dropped files. Each shows a placeholder with its progress until `upload(file, progress)` returns its URL. The placeholder is a decoration, so a collaborative document never holds a file that hasn't arrived. |
| `createEditorCodec({ plugins })` | `{ extensions, fromMarkdown, toMarkdown, verify }` for a collaborative room, such as ViteHub Realtime's `editor` option. |

`comark-ui/editor/vue` binds the editor to a Markdown string with `useComarkEditor(markdown)` or `<ComarkEditor v-model="markdown" />`. Run `pnpm playground` in this package to try it.

## Agents

The package ships the [comark-ui agent skill](https://github.com/onmax/comark-ui/tree/main/skills/comark-ui): a `SKILL.md` that says how to install the plugins, which block shows what, and how to check the result, and a reference for each package. Install it with `vp dlx skills add onmax/comark-ui`, link it from `node_modules` with `vp dlx skills experimental_sync` (experimental), or bundle it in your own app from `comark-ui/skills/comark-ui/`, which always matches the plugins it installed.

## Linting

[comark-linter](https://comark-ui.onmax.me/lint/) finds `comark-ui` when it's installed and checks documents with its plugins and components.

## License

MIT
