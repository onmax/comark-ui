# remark-to-comark

[![npm version](https://comark-ui.onmax.me/badge.svg?source=npm-version&package=remark-to-comark&icon=npm)](https://npmx.dev/package/remark-to-comark)
[![license](https://comark-ui.onmax.me/badge.svg?label=license&value=MIT)](https://npmx.dev/package/remark-to-comark)
[![docs](https://comark-ui.onmax.me/badge.svg?label=docs&value=comark-ui.onmax.me)](https://comark-ui.onmax.me/remark-to-comark/)

Moves a project from [remark](https://github.com/remarkjs/remark) to [Comark](https://comark.dev). It reports each remark setup and what its plugins become, rewrites unified chains to Comark's `renderHtml`, and escapes the Markdown Comark would read differently, so remark still renders every file exactly as before. A CLI, a library, and a [Vite Doctor](https://github.com/onmax/vite-doctor) extension. Every finding says what was found, what to do, and where to read more.

```sh
pnpm add -D remark-to-comark
pnpm remark-to-comark check .
```

```txt
[RTC0302] docs/guide.md:12 has 3 spots Comark would read differently from remark, on lines 12, 30.
├▶ fix: Run `remark-to-comark content "docs/guide.md" --write`; remark renders the rewritten file exactly as before.
╰▶ see: https://comark-ui.onmax.me/remark-to-comark/diagnostics#rtc0302
```

`check` ends with what the migration leaves undone and the commands to run next: `rewrite <dir> --write` for unified chains, and `content <glob> --write` for Markdown. Rewritten code imports `comarkOptions` from `remark-to-comark/setup`, the Comark setup that reads Markdown like remark-parse with remark-gfm, without the rest of the package. `remark-to-comark/plugins` has Comark versions of rehype-slug, rehype-autolink-headings, rehype-external-links, rehype-unwrap-images, remark-squeeze-paragraphs, remark-reading-time, and Docusaurus' npm2yarn, each tested against the original.

Before releasing it, it was run on the 100 most-starred eligible repositories that use remark: after migration, 95% of 14,470 sampled documents render the same in Comark as in remark, and remark renders every migrated file byte for byte as before.

See the [docs](https://comark-ui.onmax.me/remark-to-comark/) for every command, each diagnostic, and the limits.
