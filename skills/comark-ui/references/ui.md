# Every plugin in one install

comark-ui registers every comark-ui package for one renderer, in the order they need, with one icon resolver shared by `:icon`, cards, details, file trees, tabs, and code actions. Install in SKILL.md shows its basic use. This page covers its options, what it turns on, its other renderers, and how the linter uses it.

## Options

`comarkUi(options)` returns `{ plugins, components }`. Each key is a package's name without `comark-`, in camelCase, such as `fileTree`, `codeNotes`, or `readingTime`. `false` turns a plugin off along with its components, and an object turns it on with those options. `true` turns on `include` and leaves the others as they are:

```ts
comarkUi({
  zoom: false,
  code: { actions: [{ id: "run", label: "Run" }] },
  github: { callouts: false, references: { repo: "owner/name" } },
  table: { root: "data" },
  include: { root: "content", base: "guide" },
});
```

`github` takes its three plugins by name, `callouts`, `references`, and `html`, and `links` takes `external` and `anchors`. Each package's reference lists its own options. The order stays fixed whatever you pass. `include` runs first, so the others read what it pastes, and `code` and `codeNotes` run last, after every plugin that writes code blocks.

## What it turns on

- Every plugin except `include`, which reads files from disk. `include: { root, base }` turns it on, or `{ read }` in a browser or an edge runtime. `include: true` reads under the working directory.
- `cast`, `table`, and `tests` get a reader that finds no file. Inline casts, CSV fences, and pasted JUnit reports render, and a `src` file doesn't load until you pass `{ root }` or `{ read }`. Any other options object replaces that reader too, so the plugin reads under the working directory.
- Three plugins use the network while parsing: `chips` downloads favicons and avatars, `icon` fetches icon sets from the Iconify API, and `diagrams` sends each diagram's source to `https://kroki.io`. In a browser, pass `chips: { download: false }`, since a browser may not download another site's images. To parse offline, also pass `icon: { fetch: false }` with your icon sets in `collections`, and `diagrams: { draw: false }`. To keep diagram sources private, pass your own Kroki `server`.
- `icon`'s options apply to every icon the preset draws, in cards, details, file trees, tabs, and code actions too.
- comark-critic has no component to add its styles, so put `criticCss`, which every entry exports, in the page.
- The text around the blocks is styled by default, scoped to the element the document renders into, on the same `--comark-*` tokens. Pass `typeset: false` when the site already styles Markdown, such as with Tailwind Typography's `prose`.

## Renderers

| Renderer | Entry |
| --- | --- |
| `@comark/html` | `comark-ui/html` |
| `@comark/vue` | `comark-ui/vue` |
| `@comark/react` | `comark-ui/react` |
| `@comark/svelte` | `comark-ui/svelte` |

The Vue, React, and Svelte entries leave out annotate, comments, diff, and quiz, which render only to HTML. Screenshots, compares, diffs, suggestions and comments, and the marks on charts need `comark-ui/html`.

To use another renderer, install it in place of `@comark/html`, such as `pnpm add comark @comark/vue comark-ui`, and pass it `plugins` and `components` as you would one package's. The preset needs Vue 3.5, React 18, or Svelte 5.20 or later. Every entry exports the `PresetOptions` type, and `comark-ui` itself exports `preset(renderer, options)`, which builds the same pair from renderer entries you pass.

## In the linter

comark-linter imports `comark-ui/html` when the project has it, and lints with all its plugins and components, ahead of any comark package installed on its own, so none runs twice. It calls `comarkUi()` with options of its own, so the app's options don't reach it:

- It draws no chart or diagram, and downloads no chip image.
- `::cast`, `::table`, and `::tests` read their `src` files from the working directory.
- `include` stays off until a lint config adds it, as [include](include.md) says.

## Register

- In `comark-ui`: this is the preset itself, registered as Install in SKILL.md shows.
- Alone: each plugin is its own package, registered as its reference says. The preset ships in lockstep with them, so `comark-ui@X` holds every plugin at version `X`.
