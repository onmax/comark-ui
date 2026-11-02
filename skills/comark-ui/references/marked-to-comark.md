# Moving a project from marked

marked-to-comark moves a project that renders Markdown with marked to Comark. It reports what it finds as diagnostics, `MKC0101` to `MKC0304`, each with a fix and a link to https://comark-ui.onmax.me/marked-to-comark/diagnostics/.

## Run it

```sh
vp exec marked-to-comark check . --json
vp exec marked-to-comark content "posts/**/*.md" --write
vp exec marked-to-comark rewrite . --write
vp exec marked-to-comark check . --json
```

- `check` lists the marked setups it finds (the shared `marked`, `new Marked()` instances) and what each option and extension becomes, the calls `rewrite` can replace and why the others stay, and the Markdown files `content` would change. `--json` prints each finding with its code, file, line, fix, and docs link.
- `rewrite` replaces `marked.parse(markdown)` inside an async function with `await renderHtml(markdown, comarkOptions({ … }))`, importing `comarkOptions` from `marked-to-comark/setup`. Install what the new code imports: `comark`, `@comark/html`, and `marked-to-comark`.
- `content` escapes `{`, `[`, and `:name` that Comark would read as attributes, spans, or components, so marked still renders every file byte for byte as before. It checks each edit with the project's own marked. Run it before `rewrite`, which removes the marked setup it reads options from.
- Run `check` again at the end. What's left is work for you: custom renderers and extensions (MKC0105), options with no counterpart (MKC0106), calls it couldn't rewrite (MKC0201), and blocks left as written (MKC0303).

## What it leaves to you

- A call in a function that isn't async stays: `renderHtml` returns a promise. Make the function async, update its callers, and run `rewrite` again.
- A custom `renderer` method becomes a component for the element it draws (`components: { a }` in @comark/html, or your framework's renderer); a tokenizer or extension becomes a Comark plugin.
- Strings marked renders at runtime, such as chat replies, need no content changes. For a reply that streams in, render with `{ ...comarkOptions(), autoClose: true }` so unfinished Markdown looks finished at every step.

## Register

- In `comark-ui`: not included. Install it beside the preset for the migration.
- Alone: `pnpm add -D marked-to-comark`. It installs the command `marked-to-comark`, the library `marked-to-comark`, the Comark setup `marked-to-comark/setup` (add it to your runtime dependencies when rewritten code imports it), and the Vite Doctor extension `marked-to-comark/doctor`.
