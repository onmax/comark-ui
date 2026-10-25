---
title: Links
description: External links with the target and rel you choose, and a link beside each heading.
keywords: external links, target blank, new tab, noopener, noreferrer, nofollow, rel, heading anchors, anchor links, permalink, deep link
tagline: Heading links that point at their own section, and external links that open where you choose and warn before a new tab.
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

## Features

- `anchors()` puts a `#` after each h2, h3, and h4 that links to the heading itself, so readers can share a section.
- `external()` writes `target` and `rel` on links to other sites while parsing, so they reach any renderer.
- Nothing opens in a new tab unless you ask.
- A link that opens a new tab ends with ↗ and "(opens in a new tab)" for screen readers, so nobody is surprised by a new tab.
- Without it, Comark gives headings ids but draws no link to them, and changes a link's target only when you write `{target="_blank"}` on it.

## Usage

The package is two plugins, and each one works alone. Register the ones you want:

```ts
import { anchors, external } from "comark-links/html";

const plugins = [anchors(), external()];
```

### Heading links

Use `anchors()` to put a `#` link after each heading. A heading needs an id for a link. Comark gives every heading one from its text, or the one you write with `{#id}`:

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

The `#` shows when the pointer is on the heading or the link has keyboard focus, and always on a touch screen.

#### Levels

Use the `levels` option to choose which heading levels get a link.

```ts
anchors({ levels: [2, 3] });
```

#### Label

Use the `label` option to change what screen readers hear for the link. It is a function that takes the heading's text.

```ts
anchors({ label: (text) => `Sección "${text}"` });
```

#### Icon

Use the `icon` option to change what the link shows.

```ts
anchors({ icon: "¶" });
```

### External links

Use `external()` to write `target` and `rel` on links to other sites. A link keeps the `target` or `rel` you write on it:

```md
[Status page](https://status.example.com){target="_self"}
[My profile](https://mastodon.social/@onmax){rel="me"}
```

#### Target

Use the `target` option to set where external links open, such as `"_blank"` for a new tab. By default they open where the reader chooses. [Open new tabs only where readers lose work](#open-new-tabs-only-where-readers-lose-work) says when a new tab helps.

```ts
external({ target: "_blank" });
```

`noopener` joins `rel` whenever the target is `_blank`.

#### Hosts

Use the `hosts` option to list your own hosts, so links to the rest of your site stay internal.

```ts
external({ target: "_blank", hosts: ["example.com", "docs.example.com"] });
```

> [!NOTE]
> A `hosts` entry matches one host exactly, so list `www.example.com` and `docs.example.com` if you link to them.

#### Rel

Use the `rel` option to add words to external links' `rel`. To mark links for search engines without changing where they open, set only `rel`:

```ts
external({ rel: ["nofollow", "ugc"] });
```

#### Warning

Use the `icon` and `label` options to change the warning after a link that opens a new tab. Every such link gets ↗ and "(opens in a new tab)", which screen readers read after the link's text. That holds whether the new tab comes from the `target` option or from a `{target}` you write. For a site in another language, change the words:

```ts
external({ target: "_blank", label: "(se abre en una pestaña nueva)" });
```

`icon: false` drops the ↗, and `label: ""` drops the words. The warning renders as:

```html
<a href="https://example.com" target="_blank" rel="noopener">Docs<span class="cl-icon" aria-hidden="true">↗</span><span class="cl-sr">(opens in a new tab)</span></a>
```

#### Which links are external

Use the `test` option to decide which links are external, from their `href`. By default a link is external when its `href` starts with `http://`, `https://`, or `//` and its host isn't in `hosts`. Links that start with `/`, `#`, or `mailto:` never are.

```ts
// Everything outside /docs, including your own blog.
external({ target: "_blank", test: (href) => /^https?:/.test(href) && !href.startsWith("https://example.com/docs") });
```

> [!NOTE]
> `test` replaces the default, so `hosts` no longer counts once you pass it.

## Examples

### Open new tabs only where readers lose work

Leave `target` off unless you have a reason. A reader who wants a new tab can open one, and one who doesn't can't stop a link from opening it. rehype-external-links stopped adding `target="_blank"` by default in its version 2 for this reason.

Some pages have a reason, such as a form the reader would lose by leaving, or a playground with unsaved work. Open external links in a new tab there, and list your own hosts so links to the rest of your site stay in the tab:

```ts
external({ target: "_blank", hosts: ["example.com", "docs.example.com"] });
```

## Accessibility

A heading's link sits beside the heading, not inside it, so screen readers don't read "#" as part of the heading's name. The `#` is hidden from them, and the link reads as `Section titled "Setup"`.

A link that opens a new tab says so before the reader follows it, as WCAG's [technique G201](https://www.w3.org/WAI/WCAG22/Techniques/general/G201) asks. Screen readers read "(opens in a new tab)" after the link's text, and skip the ↗. The HTML renderer writes the arrow's `aria-hidden="true"` in full, since Comark would write a bare `aria-hidden`, which screen readers ignore.

### Keyboard interactions

| Key | Description |
| --- | --- |
| `Tab` | Moves focus to each heading's link after the heading, and shows the `#` while it has focus. |
| `Enter` | Follows the focused link. |

## API

### Options

The options go under `links` in `comarkUi()`, as `anchors` and `external`, or to `anchors()` and `external()` when you use them alone. `false` turns one off.

#### anchors()

| Option | Default | Description |
| --- | --- | --- |
| `levels` | `[2, 3, 4]` | The heading levels that get a link. |
| `label` | `(text) => Section titled "…"` | What screen readers hear for the link, as a function of the heading's text. |
| `icon` | `"#"` | What the link shows. |

#### external()

| Option | Default | Description |
| --- | --- | --- |
| `target` | `false` | Where external links open, such as `"_blank"`. |
| `rel` | `[]` | Words added to external links' `rel`, such as `["nofollow"]`. `noopener` joins whenever the target is `_blank`. |
| `hosts` | `[]` | Your own hosts, such as `"example.com"`, whose links count as internal. Each entry matches one host exactly. |
| `test` | http and https links not on `hosts` | Which links are external, from their `href`. Replaces `hosts`. |
| `icon` | `true` | Draws ↗ after a link that opens a new tab. |
| `label` | `"(opens in a new tab)"` | What screen readers hear after that link. `""` leaves it out. |

A link keeps the `target` or `rel` you write on it, as [External links](#external-links) shows.

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

The rules sit in the `comark` CSS layer, so any plain rule of yours wins.

### Shared tokens

The heading links read these [shared tokens](/guide/theming/):

| Token | Used for |
| --- | --- |
| `--comark-muted` | The `#` link |
| `--comark-foreground` | The `#` link under the pointer |
| `--comark-ring` | The focus ring on the link |
| `--comark-radius` | The focus ring's corners |

### Classes and attributes

| Selector | Is |
| --- | --- |
| `.cl-heading` | The wrapper around a heading and its link |
| `.cl-anchor` | The heading's link |
| `.cl-icon` | The ↗ after a link that opens a new tab |
| `.cl-sr` | The text only screen readers hear |

`.cl-heading` is a flex row, so the heading keeps its own font and margins, and the link sits on its first line. Two things change for a heading inside it:

- Its margins no longer merge with the paragraph's above it, so the gap can grow. Set the margins on `.cl-heading` and zero them on the heading if that matters.
- Its border or background ends at the end of its text. Move them to `.cl-heading:has(> h2)`.

### Example

To always show the links, even with a mouse:

```css
.cl-anchor {
  opacity: 1;
}
```
