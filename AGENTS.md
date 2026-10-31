# comark-ui

Comark plugins for review documents: annotated screenshots, before/after comparisons, suggested code changes, charts, and icons. Agents write most of the documents they render, often as PR evidence. Because of that, the issue messages matter as much as the HTML: every one names its block and says how to fix it.

## Shape

A pnpm workspace. Every package in `packages/` is published to npm under its own name, and all of them share one version. Each `tsdown.config.ts` is one call to `definePackage()` or, for a package with a renderer per framework, `defineComponentsPackage()` from the root `tsdown.shared.ts`, so the packages build alike.

How most packages work, so the bullets below don't repeat it:

- A parse plugin turns syntax into explicit nodes with the props a renderer needs, so no renderer splits children or parses URLs. Renderers only draw.
- A package has no script unless its bullet says so. Its Vue, React, and Svelte components add the styles on mount, and the HTML renderer inlines them once per document.
- Where a bullet says "built like zoom's", the package's browser script is built the way `packages/zoom/src/script.ts` is.

### Packages

- `packages/annotate` is `comark-annotate`.
  - `src/read.ts` reads `::screenshot`, `::compare`, and `::annotation` nodes and reports their issues. `src/index.ts` (the parse plugin, which appends to `meta.issues`) and `src/html.ts` (the renderer) both go through it, so they can't disagree.
  - Only the HTML renderer exists. Notes are Markdown, and Vue, React, and Svelte versions would each copy the whole figure template.
  - The output reads without a script. The zoom and carousel scripts and all styles are inlined once per document.
  - A screenshot zooms with `comark-zoom`, and `::compare` is a two-column `comark-carousel`. Marks are not links, so a click anywhere on a screenshot zooms it.
  - Each screenshot's `<img>` gets its `viewport` as `width` and `height`, or the size comark-zoom's `measure()` reads from the file while rendering, so the page keeps its room before the image loads.
- `packages/badge` is `comark-badge`.
  - Prose badges normalize to `color` plus inline content. Image badges normalize to `src` and `label`: a local SVG data URI, drawn from the live npm or GitHub Actions data the parse fetched, or a hosted URL when that data is unavailable or `download` is `false`.
  - `src/svg.ts` owns the options and the SVG drawing. `src/live.ts` fetches the data for both the plugin and `src/server.ts`, which exports the bounded, cached public-data handler that `docs/server/routes/badge.svg.ts` serves at `/badge.svg`. On Cloudflare that route gives it the Cache API, so instances share data, and a `GITHUB_TOKEN` secret.
  - The builder in `docs/badges/` uses the same options. `docs/build.ts` renders it in the docs shell at `/badges/`, with an inline script that initializes again after island navigation.
- `packages/cards` is `comark-cards`.
  - Its parse plugin replaces each `::card`'s attributes with the ones it renders from, puts its title (`title` or a `#title` slot) in a `card-title` node, and resolves its `icon` through comark-icon's `Icons`. A card with `to` is covered by one stretched link.
  - `::columns` wraps each child that isn't a `:::column` in one.
- `packages/carousel` is `comark-carousel`. Its parse plugin turns `::carousel` content into explicit `slide` nodes with their position. Its script is built like zoom's, and a carousel is a zoom gallery.
- `packages/cast` is `comark-cast`.
  - Its parse plugin reads an asciinema v2 or v3 cast from `src` (read like comark-include, under `root` or through `read`) or from a code block inside `::cast`, and replays its output through the small terminal in `src/term.ts`.
  - It replaces the node's children with the final screen, or with `mode="log"` every line printed, as text and `span` nodes with `cca-` color classes or a hex `style`.
  - No player. The HTML renderer writes the spans itself, because the renderer's pretty-printing would break the lines of a `pre`.
- `packages/charts` is `comark-charts`.
  - `src/read.ts` checks a `::chart` and its table, or the `vega-lite` spec that draws any other chart over the table.
  - The parse plugin draws it with Flint and Vega and replaces the node's attributes with `type`, `title`, `label`, `svg`, and `marks`, keeping only the table as content, so no renderer loads Vega.
  - Marks need comark-annotate's figure, so only the HTML renderer draws them.
  - Its script, built like comark-table's, copies a chart as a PNG (with the page's colors set on each element of the SVG) or its data as a table or Markdown. A chart with marks copies its data, since the PNG would leave the marks out.
  - The bar's markup is one string from `bar()` in `src/client.ts`.
- `packages/chat` is `comark-chat`. It renders AI SDK chat messages, not documents, so neither the preset nor the linter loads it.
  - `read()` in `src/index.ts` reads a message's parts into text, file, and trace blocks. A trace holds each run of reasoning, tool, and source steps with their titles, statuses, and tool values as text. Every renderer goes through it.
  - Parts come from the model, so `read()` never throws and links only safe URLs.
  - `src/vue.ts`, `src/react.ts`, and `src/svelte/` render the same markup. Text goes through the framework's Comark `Markdown` with the caller's plugins; React uses `MarkdownClient`, since its `Markdown` is a server component.
  - There is no HTML renderer, because a chat runs in an app.
- `packages/chips` is `comark-chips`.
  - Its parse plugin turns every web link, `@user`, and `:chip` into a `chip` node with `href`, `kind` (`favicon` or `avatar`), `src`, and `title`.
  - `src/images.ts` downloads each image while parsing and inlines it as a data URI, cached per process. An HTTP error maps to its status; any other failure keeps the URL for the reader's browser.
- `packages/cjk` is `comark-cjk`, markdown-it-cjk-friendly run unchanged, so `**` and `*` close next to Chinese, Japanese, and Korean punctuation. No components and no styles, so it works in any renderer.
- `packages/code` is `comark-code`.
  - Its components replace `pre`. Each wraps the block, rendered as it would be without them, in `.ck` with a bar of buttons, so Shiki's output and code groups work in any plugin order.
  - The bar's markup is one string from `buttons()` in `src/client.ts` that every renderer inlines.
  - Its parse plugin only writes the configured `actions` onto matching `pre` nodes. The script sends a `comark-code-action` event for them and does nothing else.
- `packages/code-notes` is `comark-code-notes`.
  - Its `markdownItPost` strips `<1>` markers in a line-end comment from every fence an ordered list follows, so Shiki highlights clean code in any order.
  - Its `post` draws the markers as `a.cn-marker` nodes into Shiki's line spans (or its own) and turns the list into a `code-notes` node.
  - Drawing needs Shiki's lines, so it goes after `shiki` in `plugins`, and it reports the other order. `highlighted()` in `docs/build.ts` places Shiki before comark-code and it.
  - The number is CSS content, so comark-code's Copy never takes it.
- `packages/colors` is `comark-colors`.
  - Its parse plugin turns inline code that holds a hex, rgb(), hsl(), hwb(), lab(), lch(), oklab(), or oklch() color into a `color` node with `value`, and a `::palette` list of `name: color` lines into `color` nodes with `name` too.
  - The color pattern admits only the characters a color needs, since renderers write it into a style attribute.
- `packages/comments` is `comark-comments`: `:suggestion` (a suggested edit) and `:comment` (a comment on a span). They share one card style, one numbering, and one id space.
  - `src/read.ts` is the parse plugin's work and its issues. It moves each `:comment{reply="id"}` into its thread, writes each thread's `mark`, `uid`, `label`, and card entries as `thread`, and marks a thread it can't draw `plain`. `mark` is `pen` only for a change of 24 graphemes or fewer on each side, on one line, in plain text.
  - It wraps the document's blocks in one `comments` root when any card goes in the margin.
  - Only the HTML renderer exists, with no script. Each card is a `float:right` span after its anchor, a hidden checkbox, and a `<label>` bubble, so it opens in the margin on wide pages and under the line on a phone.
  - The bubble is a plain inline box with its icon as a background, since Chrome may break a line before any atomic inline, even after a word joiner.
  - It bundles `comark-zoom/theme` and `comark-annotate/font`, and writes the Caveat font only into a document with a pen mark.
- `packages/critic` is `comark-critic`.
  - An inline rule placed before Comark's attribute rule, which would otherwise drop `{++add++}`, reads CriticMarkup inside one paragraph into native `ins`, `del`, and `mark` spans with `ccm-` classes (so its styles never reach a `~~strikethrough~~`'s `del`) and a `.ccm-comment` span. `mode` accepts or rejects the changes while tokenizing.
  - A mark left open goes to `meta.issues` through a token that `markdownItPost` collects.
  - Comark sets the class from a `{.class}` after a mark in place of the mark's own, so `markdownItPost` writes both into those props.
  - No renderer: `css` holds the marks' styles, and the docs site appends it to its own.
- `packages/deflist` is `comark-deflist`, markdown-it-deflist ported to push block tokens Comark builds with any tag, so `Term` then `: Definition` renders as native `dl`, `dt`, and `dd` with no classes and no renderer.
- `packages/details` is `comark-details`.
  - Its parse plugin turns `::details`, each `:::accordion-item`, and `::collapsible` into a `disclosure` node, drawn as `<details>`. Its first child is a `disclosure-summary` holding the label, so a `#summary` slot renders as a real `<summary>`.
  - A `type="single"` accordion gives its items one `name` from a hash of the source, and Nuxt UI's `defaultValue` becomes `open`.
- `packages/diagrams` is `comark-diagrams`.
  - Its parse plugin sends each plantuml, graphviz/dot, d2, dbml, goat, or svgbob fence to a Kroki server (`server`, default kroki.io), caches the drawing per process like comark-chips, and sanitizes it with `src/sanitize.ts`.
  - It replaces the fence with a `diagram` node holding `type`, `svg`, and `label`. A fence it can't draw stays code.
- `packages/diff` is `comark-diff`.
  - `src/read.ts` reads a `::diff` node, two fenced blocks before and after, into rows with a small LCS over lines and then over the words of each changed pair, and reports its issues. The plugin and the renderer both go through it.
  - The HTML renderer draws a table with no script. It doesn't zoom: its code scrolls in place. It bundles only `comark-zoom/theme`, like comark-github.
- `packages/embed` is `comark-embed`.
  - Its parse plugin reads the player's `src` from the `::embed` link alone, with no fetch, and replaces the node's attributes with `provider`, `src`, `label`, `size`, `href`, `title`, and `host`.
  - `src/providers.ts` holds one entry per provider. A link with no player becomes a card, and one that isn't https renders nothing.
  - Its one script, `start()` in `src/client.ts`, is built like carousel's. It sets each X post's iframe to the height X's player posts to the page. The HTML renderer inlines it once per document with an X post, and the components start it on mount.
- `packages/fields` is `comark-fields`. Its parse plugin replaces each `::field`'s attributes with `name`, `type`, `required`, and `default` as strings (`:required="true"` and a JSON `:default` included). Nested `:::field` blocks render inside their parent's body.
- `packages/figure` is `comark-figure`. Its parse plugin turns an image alone in its paragraph, with a title, into a native `figure` with a `figcaption`. Its `unwrap` option lifts every lone image out of the `<p>`, captioned or not. No renderer.
- `packages/file-tree` is `comark-file-tree`.
  - Its parse plugin reads the fenced block inside `::file-tree`, indented by two spaces or pasted from `tree`, into nested `file-tree-item` nodes with `type`, `name`, `state`, `note`, and, when it's given comark-icon's `Icons`, `icon`.
  - A Markdown list inside gets an issue, because Comark turns names in it into markup.
  - Folders are `<details open>`.
- `packages/footnotes` is `comark-footnotes`, named `footnotes` so it replaces `comark/plugins/footnotes`.
  - markdown-it-footnote's block and inline rules mark definitions, references, and inline notes with `cfn-` tags. `post` numbers them and writes core's nodes and unprefixed classes (`footnote-ref`, `footnotes`), so styles made for core keep working. It's the one package whose classes don't carry its prefix.
  - A streaming parse reuses numbered references, so a WeakMap keeps what each stood for.
- `packages/github` is `comark-github`: the parts of GitHub's Markdown that Comark doesn't render like GitHub, as three named plugins and no default export.
  - `callouts()` in `src/callouts.ts` is named `alert`, so Comark's dedupe swaps it in for the built-in alert plugin and it always sees the raw `[!TYPE]` marker. It turns those blockquotes into `github-callout` nodes with `type` and `title`.
  - `references()` in `src/references.ts` turns `@user`, `#123`, and `owner/name#123` in text into plain `a` nodes, so no renderer needs a component.
  - `html()` in `src/raw-html.ts` is named `html`, so it replaces Comark's built-in html plugin, reuses its tokenizer, and prunes the nodes marked `$.html` to GitHub's allowlist.
- `packages/icon` is `comark-icon`.
  - `src/resolve.ts` is the resolver. `createIcons()` resolves `set:name` (or Nuxt UI's `i-set-name`) from `collections`, else the Iconify API, into a data URI with its ratio and whether it paints in `currentColor`. Downloads are cached per process across instances; a failed one isn't kept. `describeIconProblem()` words each problem, so every plugin that draws icons reports them alike.
  - `src/index.ts` is the parse plugin. It resolves every `:icon` in one call, writes `src`, `ratio`, `mask`, and `label` on the node, and drops one it can't draw. `name` stays, so a renderer that maps `icon` to Nuxt UI's component still works.
  - An icon is a `.ci` span with its image in `--ci`: a mask over `currentColor` when the SVG uses it, a background image otherwise. The renderers set the style as an object, because `@comark/react` splits a style string at every colon and would cut the data URI.
  - A plugin that draws icons (tabs) takes an `Icons` and draws with `iconHtml()`/`iconStyles()` from `/html` and the `Icon` component from `/vue`, `/react`, and `/svelte`.
- `packages/include` is `comark-include`. Its parse plugin pastes a Markdown partial or real source lines (`lines`, `region`) into the page from `:include{src}`. It reads under `root` (default the working directory, and a symlink that leaves `root` is refused) or through `read`, and nests up to `depth` levels (8). No renderer.
- `packages/keys` is `comark-keys`.
  - Its inline rule reads `++ctrl+shift+k++` into a `.ckb` span of `kbd` keys joined by `+`, with pymdownx.keys' names and aliases in `src/keys.ts`.
  - One unknown name leaves the shortcut as text. `++` after a letter, `+`, or `{` (comark-critic's insertion) never opens one.
  - No styles.
- `packages/lint` is `comark-linter`, a library, CLI, and Vite Doctor extension that lints Comark documents. Its command and config file are `comark-lint` (`lint-comark` still works for both).
  - `src/index.ts` is `lint()`. Comark gives nodes no positions, so block components take their line from markdown-exit tokens (plus the stripped frontmatter's lines), and everything else is found by searching the source with fenced code blanked out.
  - `src/links.ts` checks every `href` and `src`: files and their anchors through the `read`/`exists`/`list` options (Doctor passes `ctx.fs`), then the block lists. `src/urls.ts` requests external URLs for `comark/dead-url`. `lintFiles()` parses each file once so links between files share one heading index. Tests stub `fetch` and never hit the network.
  - `src/config.ts` loads the other packages in this repo through optional dynamic imports; they are optional peer dependencies. Add a new package there.
  - `src/rules/` is the catalog of every rule's code and title: the core ones in `core.ts` and one file per package. Each package's codes take their own hundred (annotate `COMARK01xx`, cards `02xx`, …). A new package takes the next one and adds its file to `src/rules/index.ts`.
  - `src/doctor.ts` is `comark-linter/doctor`. Vite Doctor has no Markdown visitor, so its Rules are manifest Rules that glob the Markdown in `onProjectEnd`. The root `doctor.config.ts` lints `docs/pages` and every package's `docs/` with it as part of `pnpm run doctor`.
- `packages/links` is `comark-links`: two named plugins and no default export.
  - `external()` in `src/external.ts` writes `target` and `rel` on external `a` nodes and appends the new-tab warning's spans while parsing, keeping an author's own `{target}` and `{rel}`. It adds one `links-styles` node for the styles.
  - `anchors()` in `src/anchors.ts` only writes an `anchor` attribute on headings with an id. The components replace `h1` to `h6` and draw the link after the heading in a `.cl-heading` wrapper, so the tree keeps its headings for `docs/build.ts`'s sidebar and search.
  - The HTML renderer also replaces `span` for the warning's `.cl-icon`, because Comark writes `aria-hidden="true"` as a bare `aria-hidden`, which screen readers ignore.
- `packages/magic-move` is `comark-magic-move`.
  - Its parse plugin turns the code blocks in `::magic-move` into `magic-move-step` nodes with their `index` and the fence's `[label]`, and gives the block every label and a `uid` from a hash of its text. The steps are tabs over one code block, like a code group.
  - The script in `src/client.ts` animates the steps with FLIP, doing what Shiki Magic Move does without importing its code, since an inlined script can't import. It reads the DOM, so it works whatever highlighted the code and in any plugin order. Without the script the steps read in turn.
- `packages/mark` is `comark-mark`, markdown-it-mark and markdown-it-sup ported to TypeScript.
  - Marks are renamed to `mdc_inline_span`, since Comark drops `mark_open`. A `^` right after `[` never opens a superscript, so `[^1]` stays a footnote reference.
  - The AST stays plain `mark` and `sup`. Each renderer's components add the `cmk-` classes and styles, so the plugin still works without them.
- `packages/math` is `comark-mathml`. Its plugin is named `math` so it replaces `comark/plugins/math`.
  - Its inline and block rules read `$…$`, `\(…\)`, `$$…$$`, and `\[…\]` (a `$` before a digit, and `\[1\]`, stay text). `markdownItPost` turns `math` fences into the same token, so Comark builds its own `math` nodes.
  - `post` typesets every one with Temml into MathML, or with KaTeX's HTML when `output` asks and `katex` is installed, cached per process in `src/typeset.ts`. It replaces each node with a `formula` holding `tex`, `display`, and `html`, so no renderer loads a typesetter.
  - A formula that fails keeps no `html` and renders its escaped TeX. A `$$` that Comark closed at the end of a stream fails without an issue.
- `packages/media` is `comark-media`.
  - Its `markdownItPost` turns an image whose `src` ends in a video or audio extension, and a bare GitHub `user-attachments` link alone in a paragraph, into a `media` token before any plugin's `post`, so comark-zoom and comark-chips never see them whatever the order.
  - Its `post` replaces the node's attributes with `kind`, `src`, `label`, `poster`, `autoplay`, `loop`, `muted`, and `native` (when the `controls: "native"` option is set).
  - A video's `width` and `height` are as written, both or neither, or read with comark-zoom's `measure()` unless the `size` option is `false`. Every renderer writes them on the `<video>`, and the 16:9 box its styles reserve applies only without them.
  - The renderers wrap the `<video controls>` or `<audio controls>` in `.cm-video` or `.cm-audio` with a bar of controls, one string from `controls()` in `src/client.ts` that every renderer inlines.
  - The script in `start()` marks each player `data-media-ready` to show the bar and drops a video's own controls. Without the script, and when the file can't play, the browser's controls show. The script is built like carousel's.
- `packages/metrics` is `comark-metrics`.
  - Its parse plugin works out each `:delta`'s arrow, percent, and verdict, and renames `:progress` to `progress-bar` with its percent, so a raw `<progress>` never reaches a component.
  - It replaces `::stats` with its table plus a Change column of `delta` cells, or with `tiles` with a `stat-tiles` node of `div` tiles holding a `dt` name, a `dd` value, and a `delta`.
- `packages/outline` is `comark-outline`. Its block is still `::toc`.
  - Its parse plugin reads every heading with an id itself, rather than relying on running after Comark's toc plugin, and replaces each `::toc` with a `toc` node holding a nested `ul` of links to the h2 headings down to `depth`. `[[toc]]` isn't read: Comark parses `[[...]]` as a span.
  - With the `rail` option it also appends a `toc-rail` node, the side outline, to a document with two headings or more to list.
  - `src/script.ts` is the rail's browser script, built like zoom's. `start()` places the rail, fixed, beside its parent (the element the document renders into) and reads the page's `--comark-inset-end`. It marks the heading being read with `aria-current`, and makes way for `data-wide` blocks by setting `data-comark-rail` on `<html>` for the page to move its text.
  - The HTML renderer inlines the script once per document as `railScript`, exported so a strict CSP can hash it. The Vue, React, and Svelte `TocRail` components start it on mount and stop it on unmount. `::toc` itself has no script.
- `packages/properties` is `comark-properties`. Its parse plugin reads the frontmatter keys in its `keys` option and writes them as a `properties` node of plain `div`/`dt`/`dd` rows, where `::properties` sits or, with `top`, first in the document. Each row's `data-kind` picks its label's Lucide icon, a CSS mask. Pull request and issue links shorten to `owner/repo#123`, `YYYY-MM-DD` dates become a `time`, status a `.cfm-status` pill, and lists `.cfm-tag` badges. `rowsOf()` builds the rows, so `ComarkEditor` shows the same rows above the text.
- `packages/qr` is `comark-qr`. Its parse plugin encodes each `:qr{value}` with uqr, a zero-dependency ES module and the package's one dependency. It writes `value`, `size` (modules, quiet zone included), and `path`, the dark modules as one SVG path of row runs, so no renderer sets inner HTML.
- `packages/quiz` is `comark-quiz`: `::question`, `::poll`, and `::recall` for lessons, read by one parser and drawn by one renderer.
  - `src/read.ts` turns each block into a prompt, its task-list options with their `>` rationales, and its slots, and reports its issues. Questions and recall cards share one number. A block inside another renders as plain content.
  - Each option's `key` is a hash of its text. A question's options are shuffled with a seed from its id and keys. An id an author leaves out is a hash of the prompt and options. So none of them depends on where the block sits.
  - `src/html.ts` is the only renderer, since the blocks need its script. Without the script, a question's answer key, rationales, and explanation sit in a `<details>`, and the script moves them where the interactive form reveals them.
  - The root carries `data-quiz-id` and `data-quiz-kind`, and each option `data-key`, plus `data-correct` on right ones, which hosts read from the server's HTML.
  - `src/script.ts` is the inlined browser script: one instance in `window.__comarkQuiz`, a MutationObserver for later blocks, `comark-quiz:answer` events, `comark-quiz:ready`, and `comark-quiz:state` from a host, with answers in localStorage until a host sends state. Its host contract is a public API that Drop codes against, so change its events and fields only on purpose.
- `packages/reading-time` is `comark-reading-time`. Its parse plugin writes `meta.readingTime = { words, minutes }` from the text outside code blocks, counting each CJK character as a word. It draws nothing, so it has no renderers and no classes.
- `packages/sources` is `comark-sources`.
  - Its parse plugin reads the one `::sources` list, turns each `:cite[n]` (or `:cite[1,3]`) into a plain `sup` of links to `#cso-n` with the source's title, and gives each source `li` a back-link to every citation of it.
  - The `sources` component draws the list and carries the styles for the markers too.
  - Its script, `start()` in `src/client.ts`, is built like carousel's. It shows a popover card for the citation under the pointer or the keyboard's focus, filled from the list item the citation points at, so the card's icon is whatever the list shows, such as a comark-chips favicon.
- `packages/steps` is `comark-steps`. Its parse plugin groups each heading at `level` in `::steps`, and what follows it, into a `step` with its `index`, or each item of the one numbered list inside. The numbers are a CSS counter.
- `packages/table` is `comark-table`.
  - Its parse plugin reads `::table{src}` (from disk under `root`, like comark-include, or through `read`), a csv, tsv, or json fence inside `::table`, and bare csv and tsv fences, into a plain `table` inside a `data-table` node, since `::table` shares its name with Markdown tables. With `sort`, it makes the headers `.ctb-sort` buttons.
  - Its script, built like carousel's, sorts and copies. Copy writes the table as HTML with tab-separated text, so spreadsheets paste cells, and its menu copies Markdown or CSV.
  - The bar's markup is one string from `bar()` in `src/client.ts` that every renderer inlines.
- `packages/tabs` is `comark-tabs`. Its parse plugin turns `::code-group` into `::tabs`, gives each `tabs-item` its label and position, and gives the `tabs` node every label and a `uid` from a hash of the source, so the HTML renderer's ids differ between documents on one page. Its script is built like carousel's.
- `packages/tests` is `comark-tests`. Its parse plugin reads a JUnit report from `::tests{src}` (from disk under `root`, like comark-include, or through `read`) or an xml fence inside the block, with the small XML parser in `src/xml.ts`. It replaces the block with a `tests` node holding `passed`, `failed`, `skipped`, `duration`, and `title`, whose children are one `details` per failure.
- `packages/xref` is `comark-xref`.
  - Its parse plugin numbers, in document order, images alone in their paragraph, elements with a `fig-` id, and `::table`s with a `tbl-` id. It wraps such an image in a `figure` with a numbered `figcaption`, gives a table a numbered `caption`, and replaces each `:ref{#id}` with a link that reads "Figure 1".
  - Its output is plain elements, so it has no renderers and ships no styles.
  - Pandoc's `@fig-x` isn't read, since `@name` is a mention in comark-chips and comark-github.
- `packages/zoom` is `comark-zoom`.
  - `src/index.ts` is the parse plugin. It marks content images and adds one `zoom-runtime` node to a document with anything to zoom. Unless `size` is `false`, it gives every image without both sides its `width` and `height` from `measure()`, so the page keeps the image's room before it loads.
  - `src/size.ts` is `comark-zoom/size`. `measure()` reads a picture's or a video's size from the first 64 KB of a URL (a range request) or from a data URI, cached per URL. `sizeOf()` reads it from bytes (PNG, JPEG, GIF, WebP, SVG, AVIF, MP4, MOV, WebM), turned by EXIF orientation or the track's matrix. A relative path, a format it doesn't know, or a file that doesn't answer within 5 seconds gets nothing.
  - comark-media and comark-annotate bundle `size` the way they bundle the theme, so every block that loads a picture or a video keeps its room.
  - `src/script.ts` is the browser script. `script()` is self-contained because the HTML renderer inlines its source. `src/client.ts` exports `start()`, which runs it with the bundled styles. The Vue, React, and Svelte components call it on mount and stop it on unmount.
  - `src/theme.ts` resolves the shared `--comark-*` tokens from Nuxt UI's `--ui-*` variables, then shadcn/ui's. `comark-zoom/theme` exports it alone. `comark-github`, `comark-embed`, and `comark-tabs` have it as a dev dependency and bundle only this entry, so they don't install zoom or carry its styles.
  - `src/html.ts`, `src/vue.ts`, `src/react.ts`, and `src/svelte/` are the renderers. They all output the same markup.
- `packages/ui` is `comark-ui`: every other package in one install, and the one the docs recommend. It has no docs page of its own: `docs/pages/getting-started.md` is its page, and its homepage is the site. Add a new package here too.
  - `preset()` in `src/index.ts` takes one renderer's entries of the packages with components, adds the parse-only ones itself, and returns `{ plugins, components }` in the order the docs render with. One `createIcons()` is shared by icon, cards, details, file-tree, tabs, and code. Each renderer entry only passes its imports. The Vue, React, and Svelte entries leave out annotate, comments, diff, and quiz.
  - It re-exports comark-critic's `css` as `criticCss`, since a project can't import a dependency of a dependency.
  - Typeset: `src/typeset-css.ts` is the text around the blocks, shadcn/typeset on the `--comark-*` tokens, with no imports but the theme, so `comark-ui/client` exports it to browsers too. `src/typeset.ts` is its plugin, on by default, which appends one `typeset-styles` node.
    - Every renderer, Vue, React, and Svelte included, writes that node as a `<style>` in the document rather than on mount, because its `@scope` with no selector scopes to the style's parent. A server render therefore arrives styled.
    - It paints T3 Code's grain as the root's `background-image` through `--comark-grain` (`none` turns it off).
    - It sits in `@layer comark { @layer typeset }`, below every block's rules in `comark` itself, whatever order the styles load in.
  - Mermaid: it registers comark-pele, a third-party plugin, under `mermaid`.
    - `src/client.ts` maps Pele's `--pele-*` variables to the `--comark-*` tokens on its `.pele-diagram` card, and each entry adds those styles the way a package's components do.
    - Every entry wraps Pele's card in a `.cmm` div with the source in `data-source` and a bar of Copy image and Copy source, one string from `mermaidBar()` in `src/client.ts`.
    - `src/script.ts` is the bar's script. The HTML entry inlines it once per document and exports it as `mermaidScript` for hosts that allow scripts by hash.
    - In HTML the card zooms with comark-zoom unless the preset's `zoom` is `false`, and the wrapper is the wide block. In Vue, React, and Svelte, Pele's `mount()` zooms it in place.
  - `src/nuxt-ui.ts` is `comark-ui/nuxt-ui`. `nuxtUiTheme()` rebuilds a Nuxt UI app's `--ui-*` variables from its `ui.colors` and main CSS, for pages that render Comark outside the app. It mirrors Nuxt UI 4.12's `runtime/index.css` and colors plugin, so recheck it when Nuxt UI changes them.
  - Its build copies every agent skill in the root `skills/` into `dist/skills/<name>/`, so apps can bundle the skills that match the plugins they installed. It also inlines their files as text in `comark-ui/skills` (`src/skills.ts`, filled by `tsdown.config.ts`) for a host that can't read `node_modules`, such as a Worker. `test/skills.test.ts` checks both through the package's exports.
  - `docs/plugins.ts` renders the site through the preset, and comark-linter loads it before the separate packages.

### Shared code and skills

- `shared/` holds the helpers more than one package needs. tsdown bundles each into the packages that import it by relative path, so nothing in it is published on its own. Svelte components ship as source and can't import from it. Add a helper here when a third package needs it, rather than copying it.
  - `text.ts`: reads a prop as text (`scalar`, `text`, `rawText`), and has `errorText` and the FNV-1a `hash` that ids derive from.
  - `html.ts`: `attr`. `nodes.ts`: `isElement` and `childrenOf`. `url.ts`: `isWebUrl`.
  - `styles.ts`: the `addStyles(name, css)` every `client.ts` wraps.
  - `disk.ts`: the root-guarded reader behind `include`, `table`, `tests`, and `cast`.
  - `disclosure.ts`: the animation for disclosures.
  - `markdown-it.ts`: bundled by each package that adds Markdown syntax. Comark builds nodes from a closed table of token types, so these plugins emit `blockquote` or `mdc_inline_span` tokens with their own tag, never `mdc_block_slot`, which a `::component` reads as a named slot. It also places rules next to anchors that may be missing, as Comark's are under `registerDefaultPlugins: false`, and keeps one markdown-it function per set of options, since Comark caches parsers by their identity.
- `skills/comark-ui` is the agent skill for the blocks.
  - `vp dlx skills add onmax/comark-ui` installs it from GitHub, the docs serve it under `/.well-known/skills/` through nuxt-agent-discovery, and comark-ui ships it.
  - `SKILL.md` installs the plugins, routes each block to its package's reference in `references/`, and holds what several packages share, such as the marks.
  - `test/workspace.test.ts` checks that every package has a reference linked from `SKILL.md` that ends with its Register section. A new package adds one, and a change to a package's syntax updates it.
- `skills/before-after-evidence`, `review-document`, `visual-explanation`, and `teach-lesson` are the skills for a whole document: what goes in it and in what order.
  - `vp dlx skills add onmax/comark-ui` lists them beside comark-ui and installs the ones picked.
  - Each installs alone, so it carries the syntax of the blocks it uses in `references/blocks.md` and links nothing outside its folder. Its `references/example.md` is a finished document.
  - Each has a page in `docs/pages/skills/`, listed by `skillOrder` in `docs/build.ts`, that leads with that example rendered. The build fails on a skill without one.

### Docs site

- `docs/` builds the docs site with the plugins themselves, as a Nuxt app that prerenders every page.
  - Its Nitro output in `docs/dist` is a Cloudflare Worker (`wrangler.jsonc` at the root) that runs before the static assets.
  - `docs/server/middleware/site.ts` redirects the old hosts and paths and serves the prerendered file or a page's Markdown copy. `docs/server/utils/site.ts` redirects the old per-topic pages to each package's page. `docs/server/routes/badge.svg.ts` is the badge.
  - ViteHub adds the team's tools, all limited to the logins in `docs/server/utils/team.ts`: GitHub sign-in (`docs/server/auth.ts`), Figma-style comments (`docs/server/comments.ts`), which the Worker adds to a page only for a team member who opened the Console, and the Console's Markdown editor (`docs/server/content.ts`). Anonymous visitors get only prerendered files.
  - `docs/build.ts` renders every page and writes each one's body to `docs/.generated/pages/`. The Nuxt app in `docs/app` only serves those bodies as server islands, for client-side navigation. Change a page's markup in `build.ts`, never in the app.
- Pages:
  - Each package has one page, `packages/<name>/docs/index.md`, which `files` keeps out of npm. It is written for comark-ui users in the shape `docs/WRITING.md` gives; read that before you write or restructure any page.
  - A page's API section ends with `### Package`, which installs and registers the package alone. A block's page has no installer, because Getting started installs comark-ui.
  - A package with several rich components gets a page each in its `docs/components/` (annotate), or beside its page in its `docs/` (comark-charts' `notes.md`). Every chart type, gantt and Vega-Lite included, is on the Charts page, since they're one block. comark-linter keeps several pages.
  - Sub-pages sit under the package's page in the rail, in the order that page links them. The build fails on one it doesn't link. A sub-page's `title` is the rail's label, so give a chart's sub-page a readable one, such as Notes and targets.
  - `docs/pages/` holds the rest of the site: the landing page, guides, recipes, and comparisons.
  - `docs/pages/doctor/` is the linter's rules, under Linter in the rail: an overview and one page per rule, at `doctor/<rule without comark/>.md`, with no frontmatter, since `docs/doctor.ts` takes the title from the catalog. Each page has an `::incorrect` and a `::correct` block around one fenced example. `test/doctor.test.ts` checks that every rule has a page, that the incorrect example reports its rule alone, and that the correct one reports nothing. Vite Doctor links each code to its page.
- Rail and search:
  - The site is laid out like ui.nuxt.com: a rail of a few sections (Docs, Components, Typography, Linter, Playground), each with a column of its pages.
  - A package page's frontmatter gives the block's name as `title`, and its group, icon, blurb, and credits. The group picks the section: Review blocks, Charts and diagrams, Docs blocks, and Page behavior are Components; Markdown syntax is Typography; Authoring tools are the docs' Utilities; Linter is the linter's. A section lists its packages by name.
  - `packageOrder` in `docs/build.ts` orders the packages in the rail, on the landing page, and in the playground.
  - Search reads every page's title, headings, and text. A page's `keywords` frontmatter lists only the words people search for that the page doesn't say, such as other tools' names for its blocks.
- Playground:
  - `docs/plugins.ts` is the one list of plugins the pages and the playground render with. `docs/play.ts` is the playground, bundled with Vite. Its presets are the examples at the top of each page.
  - `/play/gallery/` is the component gallery, for looking over every block at once: each example in `docs/examples.ts` in a frame on a canvas that pans and zooms, a row per package, in light, dark, or both, with a filter. A frame can't be told its color scheme, so `docs/gallery.ts` rewrites each frame's `prefers-color-scheme` queries to force one.
  - Its inspector edits a cell's props, copies the cell, or spreads one prop into a copy per value. `docs/gallery-render.ts` renders the change in the browser with the plugins the page used, from `docs/example-plugins.ts`. The changes ride in the URL's `edit` parameter.
  - A prop's values come from the `| Prop |` tables in its package's docs, read by `docs/props.ts`, so a description that lists them as "`a`, `b`, or `c`" gives the prop a select.
  - `pnpm gallery` builds the packages and the site and serves it at http://127.0.0.1:4173/play/gallery/ (`E2E_PORT` picks the port). `pnpm gallery:shots` screenshots it, one PNG per package, with its row wrapped to the window.
- A reference table, `| Prop | Default | Description |` (or Option or Attribute), is drawn with comark-fields, while the Markdown copy keeps the table.
- `docs/style.css` lists every class that draws its own frame, in the `.example-preview` rules and the `.demo-page` card rule, so an example or a landing card doesn't frame it again. A new package with a bordered block adds its class to both.

## Rules

- Follow the 90/10 rule. If a feature would take most of the code for a small share of users, leave it out.
- Test through the public interface: parse plus render. Don't test internals.
- Rendering never throws. Problems go in `meta.issues`, one sentence each that names the block and the fix. Every plugin appends to the list and never replaces it, since several run on one document.
- Each issue also names its rule, `comark/<package>/<kind>`, in `meta.issueRules`, keyed by the sentence. Plugins merge into it the same way. A new kind of issue needs its rule in `packages/lint/src/rules/<package>.ts` and a page in `docs/pages/doctor/<package>/`.
- Comments are rare and explain why, never what.
- Each package's classes start with its own prefix, since every package's styles share the `comark` layer. Pick an unused prefix for a new package. Taken: `ca` annotate, `cc` carousel, `cch` charts, `cp` chips, `ck` code, `cd` diff, `ce` embed, `cgc` github, `ci` icon, `ckb` keys, `cs` steps, `ccr` cards, `cb` badge, `ct` tabs, `cz` zoom, `cca` cast, `cm` media, `cqr` qr, `cfl` fields, `cft` file-tree, `cdt` details, `cco` colors, `ccm` critic, `cl` links, `cfm` properties, `cso` sources, `cdg` diagrams, `cmt` metrics, `cfn` footnotes, `cxr` xref, `cn` code-notes, `ctr` tests, `cqz` quiz, `cmk` mark, `cmh` math, `cht` chat, `cmv` magic-move, `cr` comments, and `cmm` comark-ui's Mermaid wrapper.
- Every build runs publint, so a package whose `exports`, `files`, or types don't resolve fails to build. Svelte entries ship as source with a hand-written `index.d.ts`; keep it in step with the components' props.
- `pnpm ready` formats, lints, typechecks, builds, tests, and runs Vite Doctor with the strict TypeScript preset (each package's `doctor.config.json`). Run it before opening a PR; CI runs the same steps.
- Use conventional commit titles. uppt builds the release from them (see Releasing below).
- A pull request that changes how a block looks shows the change, before and after.
  - After `pnpm build && node docs/build.ts`, run `pnpm gallery:shots --out test-results/after <package>…` for each package it touches.
  - Run the same with `--site https://comark-ui.onmax.me --out test-results/before` for the live site, which is `main`.
  - Each screenshot shows every frame in light and in dark. `--edit` takes a gallery link's `edit` parameter, to show changed props or copies.
  - Publish a Comark document with one `::compare` per package, before then after, to Drop. Link it from the PR description and give the maintainer the link.
  - A new block has no before, so show its after alone.
- Never comment on issues or pull requests without explicit consent.

## Releasing

uppt opens a draft `release/vX.Y.Z` PR from conventional commits on `main`, in lockstep for every package matched by `packages/*`. Merging it tags the version and publishes each package to npm through OIDC trusted publishing, with no approval step.

- A new package needs a trusted publisher on npmjs.com before its first release, with workflow `release.yaml`, environment `npm`, and `npm publish` allowed.
- If publishing fails after the tag exists, run `gh workflow run release.yaml --repo onmax/comark-ui --ref vX.Y.Z`.
- The docs deploy through Cloudflare Workers Builds on every push to `main`.
