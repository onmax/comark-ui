---
title: Links
description: External links with the target and rel you choose, and a link beside each heading.
keywords: external links, target blank, new tab, noopener, noreferrer, nofollow, rel, heading anchors, anchor links, permalink, deep link
tagline: Say which links open a new tab and warn before they do, and give every section a link to itself.
group: Page behavior
icon: link
blurb: External links and heading anchors
credits: 'The heading markup is <a href="https://github.com/withastro/starlight/pull/3033">Starlight''s</a>, the defaults follow <a href="https://github.com/rehypejs/rehype-external-links">rehype-external-links</a>, and the new-tab warning is WCAG''s <a href="https://www.w3.org/WAI/WCAG22/Techniques/general/G201">G201</a>.'
---

::examples
:::example{label="Heading links"}
```md
## Rollout plan

Point at the step people ask about, not the top of the page.

### Week one

Internal teams only.
```
:::

:::example{label="New tab"}
```md
Read [the incident report](https://example.com/incidents/42){target="_blank"} before the review, then come back to [the checklist](/links/).
```
:::
::

Two plugins, each one on its own:

- `anchors()` puts a `#` after each h2, h3, and h4, linking to the heading itself, so readers can share a section. It shows when the pointer is on the heading, or always on a touch screen. The link sits beside the heading, not inside it, so screen readers don't read "#" as part of the heading's name.
- `external()` writes `target` and `rel` on links to other sites while parsing. It opens nothing in a new tab unless you ask, and when a link does open one, it adds ↗ and "(opens in a new tab)" for screen readers, so nobody is surprised by a new tab.

Comark gives headings ids but draws no link to them, and changes a link's target only when you write `{target="_blank"}` on it.

## Usage

### Heading links

A heading needs an id for a link. Comark gives every heading one from its text, or the one you write with `{#id}`:

```md
## Install with pnpm {#install}
```

With `headingIds: false` and no `{#id}`, a heading gets no link.

Each heading with a link renders as Starlight's do:

```html
<div class="cl-heading">
  <h2 id="setup">Setup</h2>
  <a class="cl-anchor" href="#setup"><span aria-hidden="true">#</span><span class="cl-sr">Section titled "Setup"</span></a>
</div>
```

### External links

A link keeps the `target` or `rel` you write on it:

```md
[Status page](https://status.example.com){target="_self"}
[My profile](https://mastodon.social/@onmax){rel="me"}
```

When a link to another site opens a new tab, from `target` or from your own `{target}`, it ends with the warning:

```html
<a href="https://example.com" target="_blank" rel="noopener">Docs<span class="cl-icon" aria-hidden="true">↗</span><span class="cl-sr">(opens in a new tab)</span></a>
```

## Examples

### New tabs

Leave `target` off unless you have a reason. A reader who wants a new tab can open one, and one who doesn't can't stop a link from opening it. rehype-external-links stopped adding `target="_blank"` by default in its version 2 for this reason.

Some pages have a reason, such as a form the reader would lose by leaving, or a playground with unsaved work. Open external links in a new tab there, and list your own hosts so links to the rest of your site stay in the tab:

```ts
external({ target: "_blank", hosts: ["example.com", "docs.example.com"] });
```

Every link that opens a new tab gets ↗ and "(opens in a new tab)", which screen readers read after the link's text. That is WCAG's [technique G201](https://www.w3.org/WAI/WCAG22/Techniques/general/G201): say a link opens a new window before the reader follows it. For a site in another language, change the words:

```ts
external({ target: "_blank", label: "(se abre en una pestaña nueva)" });
```

To mark links for search engines without changing where they open, set only `rel`:

```ts
external({ rel: ["nofollow", "ugc"] });
```

### Which links are external

By default a link is external when its `href` starts with `http://`, `https://`, or `//` and its host isn't in `hosts`. Pass `test` to decide yourself, from the `href`:

```ts
// Everything outside /docs, including your own blog.
external({ target: "_blank", test: (href) => /^https?:/.test(href) && !href.startsWith("https://example.com/docs") });
```

`test` replaces the default, so `hosts` no longer counts once you pass it.

## API

The options go under `links` in `comarkUi()`, as `anchors` and `external`, or to `anchors()` and `external()` when you use them alone. `false` turns one off.

### anchors()

| Option | Default | What it does |
| --- | --- | --- |
| `levels` | `[2, 3, 4]` | The heading levels that get a link |
| `label` | `Section titled "…"` | What screen readers hear for the link, from the heading's text |
| `icon` | `"#"` | What the link shows |

### external()

| Option | Default | What it does |
| --- | --- | --- |
| `target` | `false` | Where external links open, such as `"_blank"` |
| `rel` | `[]` | Words added to external links' `rel`, such as `["nofollow"]` |
| `hosts` | `[]` | Your own hosts, such as `"example.com"`, whose links count as internal |
| `test` | http and https links not on `hosts` | Which links are external, from their `href` |
| `icon` | `true` | Draws ↗ after a link that opens a new tab |
| `label` | `"(opens in a new tab)"` | What screen readers hear after that link; `""` leaves it out |

`noopener` joins `rel` whenever the target is `_blank`. A link keeps the `target` or `rel` you write on it, as [External links](#external-links) shows.

A `hosts` entry matches one host exactly, so list `www.example.com` and `docs.example.com` if you link to them. By default, links that start with `/`, `#`, or `mailto:` are never external.

### Package

comark-ui brings `comark-links` and registers both plugins. To use it alone, install it, register the plugins you want, and pass the renderer's `components`:

```sh
pnpm add comark @comark/html comark-links
```

```ts
import { createHtmlRenderer } from "@comark/html";
import { anchors, components, external } from "comark-links/html";

const render = createHtmlRenderer({
  plugins: [anchors(), external({ target: "_blank", hosts: ["example.com"] })],
  components,
});
```

Each plugin works alone, in any order. The package has no default export, so import the plugins by name.

`external()` does all its work while parsing, so its `target` and `rel` reach any renderer. The components draw the heading links, and add the styles once per document.

For Vue, React, or Svelte, import from `comark-links/vue`, `comark-links/react`, or `comark-links/svelte`; the components add the styles when they mount. Import `comark-links/style.css` with your styles so a server-rendered page doesn't shift. [Renderers](/guide/renderers/) covers using it with other plugins.

The components replace how `h1` to `h6` render, and draw a heading as it would be without them unless `anchors()` gave it a link. The heading stays where it was in the document's tree, so a table of contents built from the tree still finds it.

## Theme

### Styling

The rules sit in the `comark` CSS layer, so any plain rule of yours wins. The classes are `.cl-heading` around a heading and its link, `.cl-anchor` on the link, `.cl-icon` on the arrow, and `.cl-sr` on the text only screen readers hear. The heading links read these [shared tokens](/guide/theming/):

| Token | Used for |
| --- | --- |
| `--comark-muted` | The `#` link |
| `--comark-foreground` | The `#` link under the pointer |
| `--comark-ring` | The focus ring on the link |
| `--comark-radius` | The focus ring's corners |

`.cl-heading` is a flex row, so the heading keeps its own font and margins, and the link sits on its first line. Two things change for a heading inside it:

- Its margins no longer merge with the paragraph's above it, so the gap can grow. Set the margins on `.cl-heading` and zero them on the heading if that matters.
- Its border or background ends at the end of its text. Move them to `.cl-heading:has(> h2)`.

To always show the links, even with a mouse:

```css
.cl-anchor {
  opacity: 1;
}
```
