# comark-links

[![npm version](https://npmx.dev/api/registry/badge/version/comark-links)](https://npmx.dev/package/comark-links)
[![npm downloads](https://npmx.dev/api/registry/badge/downloads-month/comark-links)](https://npmx.dev/package/comark-links)
[![install size](https://npmx.dev/api/registry/badge/size/comark-links)](https://npmx.dev/package/comark-links)
[![license](https://npmx.dev/api/registry/badge/license/comark-links)](https://npmx.dev/package/comark-links)
[![docs](https://img.shields.io/badge/docs-comark--ui.onmax.me-14b8a6?labelColor=0a0a0a)](https://comark-ui.onmax.me/links/)

Links in [Comark](https://comark.dev): a `#` link beside each heading, and external links with the `target` and `rel` you choose and a warning before one opens a new tab. For HTML, Vue, React, and Svelte.

```sh
pnpm add comark comark-links
```

```ts
import { createHtmlRenderer } from "@comark/html";
import { anchors, components, external } from "comark-links/html";

const render = createHtmlRenderer({
  plugins: [anchors(), external({ target: "_blank", hosts: ["example.com"] })],
  components,
});
```

Each plugin works alone, so register only the ones you want.

## Heading links

`anchors()` gives each h2, h3, and h4 a `#` link to itself, after the heading and outside it, as [Starlight](https://github.com/withastro/starlight/pull/3033) renders them:

```html
<div class="cl-heading">
  <h2 id="setup">Setup</h2>
  <a class="cl-anchor" href="#setup"><span aria-hidden="true">#</span><span class="cl-sr">Section titled "Setup"</span></a>
</div>
```

The heading stays where it is in the document's tree, so a table of contents built from it still works; the components draw the link. A heading without an id gets none. Its options change the levels, what screen readers hear, and what the link shows:

```ts
anchors({ levels: [2, 3], label: (text) => `Link to ${text}`, icon: "¶" });
```

## External links

`external()` writes `target` and `rel` on links to other sites while parsing, so every renderer outputs them. It never replaces a `{target}` or `{rel}` you write on a link.

| Option | Default | |
| --- | --- | --- |
| `target` | `false` | Where external links open, such as `"_blank"` |
| `rel` | `[]` | Words added to `rel`, such as `["nofollow"]`; `noopener` joins whenever the target is `_blank` |
| `hosts` | `[]` | Your own hosts, whose links count as internal |
| `test` | http(s) links not on `hosts` | Which links are external, from their `href` |
| `icon` | `true` | Draws ↗ after a link that opens a new tab |
| `label` | `"(opens in a new tab)"` | What screen readers hear after it, as WCAG's [G201](https://www.w3.org/WAI/WCAG22/Techniques/general/G201) asks |

`target` is off by default, as in [rehype-external-links](https://github.com/rehypejs/rehype-external-links) v2: readers choose where a link opens.

## Renderers

| Renderer | Import |
| --- | --- |
| `@comark/html` | `comark-links/html`: the styles are inlined once per document |
| `@comark/vue` | `comark-links/vue` |
| `@comark/react` | `comark-links/react` |
| `@comark/svelte` | `comark-links/svelte` |

Each entry exports both parse plugins and the renderer's `components`, which replace how `h1` to `h6` render. The Vue, React, and Svelte components add the styles when they mount; import `comark-links/style.css` with your styles so a server-rendered page doesn't shift. The styles sit in a `comark` CSS layer, so any plain rule of your own wins.
