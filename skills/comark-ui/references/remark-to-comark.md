# Moving a project from remark

remark-to-comark moves a project that renders Markdown with remark, rehype, unified, or react-markdown to Comark. It reports what it finds as diagnostics, `RTC0101` to `RTC0303`, each with a fix and a link to https://comark-ui.onmax.me/remark-to-comark/diagnostics/.

## Run it

```sh
vp exec remark-to-comark check . --json
vp exec remark-to-comark content "**/*.{md,mdx}" --write
vp exec remark-to-comark rewrite . --write
vp exec remark-to-comark check . --json
```

- `check` lists the remark setups it finds and what each plugin becomes, the unified chains `rewrite` can replace and why the others stay, the Markdown files `content` would change, and the MDX it leaves alone. `--json` prints each finding with its code, file, line, fix, and docs link.
- `rewrite` replaces a chain like `unified().use(remarkParse).use(remarkRehype).use(rehypeStringify).process(markdown)` with `renderHtml(markdown, comarkOptions({ … }))`, importing `comarkOptions` from `remark-to-comark/setup`. Install what the new code imports: `comark`, `@comark/html`, and `remark-to-comark`.
- `content` escapes `{`, `[`, and `:name` that Comark would read as attributes, spans, or components, so remark still renders every file byte for byte as before. It parses with the project's syntax plugins, so `$x_{i}$` stays math. Run it before `rewrite`, which removes the remark code it reads them from.
- Run `check` again at the end. What's left is work for you: framework configs (RTC0101), the project's own plugins (RTC0105), chains it couldn't rewrite (RTC0201), MDX (RTC0301), and blocks left as written (RTC0303).

## What it leaves to you

- A framework config, such as Astro's `markdown.remarkPlugins` or Docusaurus' `remarkPlugins`, stays as it is: the framework calls remark. Render with `renderHtml(markdown, comarkOptions())` where the framework lets you, such as a content loader or a route.
- react-markdown becomes `<Markdown value={markdown} options={…} plugins={[…]} />` from `@comark/react`, with the plugins the findings name.
- A plugin a comark-ui package replaces is reported with that package (RTC0102); its markup differs from the remark plugin's, so check pages that style it.
- MDX stays MDX. Convert a page by hand only when its JSX just passes props: rename it to `.md`, run `content` on the prose, then write the components as Comark blocks. `content` escapes Comark syntax, so don't run it after you add them.

## Register

- In `comark-ui`: not included. Install it beside the preset for the migration.
- Alone: `pnpm add -D remark-to-comark`. It installs the command `remark-to-comark`, the library `remark-to-comark`, the Comark setup `remark-to-comark/setup` (add it to your runtime dependencies when rewritten code imports it), the ports `remark-to-comark/plugins`, and the Vite Doctor extension `remark-to-comark/doctor`.
