# Moving a project from markdown-it

markdown-it-to-comark moves a project that renders Markdown with markdown-it to Comark. It reports what it finds as diagnostics, `MIC0101` to `MIC0303`, each with a fix and a link to https://comark-ui.onmax.me/markdown-it-to-comark/diagnostics/.

## Run it

```sh
vp exec markdown-it-to-comark check . --json
vp exec markdown-it-to-comark content "**/*.md" --write
vp exec markdown-it-to-comark rewrite . --write
vp exec markdown-it-to-comark check . --json
```

- `check` lists the markdown-it instances and framework hooks it finds, what each option and plugin becomes, the instances `rewrite` can replace and why the others stay, and the Markdown files `content` would change.
- `rewrite` replaces `const md = new MarkdownIt(options).use(plugin)` with `const md = comarkOptions({ ...options, plugins: [markdownItPlugin(plugin)] })` and each `md.render(src)` with `(await renderHtml(src, md))`. It only does so when every `render` call is in an async function, since Comark renders asynchronously. Install `comark`, `@comark/html`, and `markdown-it-to-comark`.
- `content` escapes `{`, `[`, and `:name` that Comark would read as attributes, spans, or components, and keeps an edit only if markdown-it renders the file byte for byte as before. It reads with the project's preset, options, and plugins, so `::: tip` containers and `[^1]` footnotes stay as written.
- Run `check` again at the end. What's left is work for you: framework setups (MIC0101), plugins and hand-made changes nobody compared (MIC0105), setups it couldn't rewrite (MIC0201), and blocks left as written (MIC0303).

## What it leaves to you

- A framework's instance, such as VitePress' `markdown.config(md)` or Eleventy's `setLibrary("md", …)`, stays as it is: the framework renders. Render with `renderHtml(markdown, comarkOptions())` where the framework lets you.
- A markdown-it plugin keeps its output on Comark through `markdownItPlugin(plugin, ...options)` from `markdown-it-to-comark/plugins`, renderer rules included. A comark-ui package that does the same job is reported with it (MIC0102); its markup differs.
- A renderer rule set by hand (`md.renderer.rules.fence = …`) moves into a plugin function registered with `markdownItPlugin()`.

## Register

- In `comark-ui`: not included. Install it beside the preset for the migration.
- Alone: `pnpm add -D markdown-it-to-comark`. It installs the command `markdown-it-to-comark`, the library, the Comark setup `markdown-it-to-comark/setup` and the bridge `markdown-it-to-comark/plugins` (add the package to your runtime dependencies when rewritten code imports them), and the Vite Doctor extension `markdown-it-to-comark/doctor`.
