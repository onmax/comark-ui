# comark-github

[![npm version](https://comark-ui.onmax.me/badge.svg?source=npm-version&package=comark-github&icon=npm)](https://npmx.dev/package/comark-github)
[![npm downloads](https://comark-ui.onmax.me/badge.svg?source=npm-downloads&package=comark-github&period=month&icon=npm)](https://npmx.dev/package/comark-github)
[![license](https://comark-ui.onmax.me/badge.svg?label=license&value=MIT)](https://npmx.dev/package/comark-github)
[![docs](https://comark-ui.onmax.me/badge.svg?label=docs&value=comark-ui.onmax.me)](https://comark-ui.onmax.me/github/)

The parts of GitHub's Markdown that [Comark](https://comark.dev) doesn't render like GitHub: alerts as callouts, `@user` and `#123` as links, and raw HTML limited to what GitHub allows. For HTML, Vue, React, and Svelte.

```sh
pnpm add comark comark-github
```

```ts
import { createHtmlRenderer } from "@comark/html";
import { callouts, components, html, references } from "comark-github/html";

const render = createHtmlRenderer({
  plugins: [callouts(), references({ repo: "onmax/comark-ui" }), html()],
  components,
});
```

Each plugin works alone, so register only the ones you want.

## Callouts

`callouts()` draws GitHub's alerts, `> [!NOTE]` through `> [!CAUTION]`, with an icon and a title. Text after the marker on its line replaces the title:

```md
> [!WARNING] Breaking change in v2
> The `render` option moved.
```

`callouts()` replaces Comark's built-in alert plugin. A quote without a marker, or with another type, stays a quote. `callouts({ titles: { note: "Nota" } })` changes the default titles.

## References

`references({ repo })` links `@user` to the profile, and `#123` or `owner/name#123` to the issue or pull request, as GitHub does in comments. Without `repo`, a bare `#123` stays text. Links, code, emails, and npm scopes such as `@comark/html` stay as written.

## HTML

`html()` renders raw HTML the way GitHub does. Tags such as `<sub>`, `<sup>`, `<kbd>`, `<details>`, and `<picture>` stay with GitHub's attributes, such as `align`, `width`, and `open`. `script` and `style` are removed with their content, and any other tag is replaced by its content. A URL must be relative, http, https, or (for links) mailto. Comark renders all raw HTML as written, so use this when people other than you write the Markdown. It replaces Comark's built-in html plugin. Components written as Markdown, such as `::callout`, aren't touched; Comark's `security` plugin covers those.

## Renderers

| Renderer | Import |
| --- | --- |
| `@comark/html` | `comark-github/html`: the styles are inlined |
| `@comark/vue` | `comark-github/vue` |
| `@comark/react` | `comark-github/react` |
| `@comark/svelte` | `comark-github/svelte` |

Each entry exports the three parse plugins and the renderer's `components`, which draw the callouts. The Vue, React, and Svelte components add the styles when they mount; import `comark-github/style.css` with your styles so a server-rendered page doesn't shift.

## Customize

The callout styles follow shadcn/ui's Alert: they read its CSS variables, such as `--background`, `--border`, `--muted-foreground`, and `--destructive`, when the page has them, and use its neutral theme otherwise. Set the shared `--comark-*` tokens to theme callouts with zoom, carousel, and annotate, or `--cgc-note` through `--cgc-caution` to recolor one type. The rules sit in a `comark` CSS layer, so any plain rule of your own wins; see the callouts' [Theming page](https://comark-ui.onmax.me/github/#theme).

The icons are [Lucide](https://lucide.dev)'s, under its license (see `LICENSE`).

Docs and live demos: [comark-ui.onmax.me/github](https://comark-ui.onmax.me/github/).
