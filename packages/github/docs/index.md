---
title: GitHub
description: GitHub's alerts, references, and raw HTML, rendered as on GitHub.
keywords: callout, alert, admonition, note, tip, important, warning, caution, GFM, GitHub Flavored Markdown, issue links, mentions, raw HTML, sanitize, blockquote
tagline: GitHub's alerts, references, and raw HTML, rendered the way GitHub renders them.
group: Review blocks
icon: github
blurb: 'GitHub''s alerts, references, and HTML'
credits: 'Syntax from <a href="https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax">GitHub''s Markdown</a>, and the allowed HTML from its <a href="https://github.com/gjtorikian/html-pipeline">html-pipeline</a>.'
---

::examples
:::example{label="Callouts"}
```md
> [!NOTE]
> Drafts save every few seconds, so closing the tab keeps your work.

> [!TIP]
> Press ⌘K to search every document.

> [!IMPORTANT]
> Releases ship from `main` only.

> [!WARNING]
> Changing the slug breaks links people already shared.

> [!CAUTION]
> Deleting a folder deletes every document in it.
```
:::

:::example{label="Custom title"}
```md
> [!IMPORTANT] Decision
> Keep the existing endpoint. Clients pin its response shape.
```
:::

:::example{label="Lists and code"}
```md
> [!WARNING] Breaking change in v2
> `render(markdown)` is gone. Create a renderer once instead:
>
> - pass it your `plugins` and `components`
> - key `components` by tag name
>
> ```ts
> const render = createHtmlRenderer({ plugins, components });
> ```
```
:::

:::example{label="References"}
```md
Thanks @onmax: this fixes #51, and onmax/comark-ui#73 builds on it.
```
:::

:::example{label="HTML"}
```md
Press <kbd>⌘</kbd> <kbd>K</kbd> to search. Water is H<sub>2</sub>O.

<img src="/dashboard.png" width="480" alt="Office correlations: ducks vs. bugs, r = 0.94">

<details>
<summary>Where did the script go?</summary>
The source has a <code>&lt;script&gt;</code> after this sentence. GitHub drops it, and so does <code>html()</code>. <script>alert("hi")</script>
</details>
```
:::
::

## Features

- Three plugins that each work alone, in any order: `callouts()`, `references()`, and `html()`.
- `callouts()` draws GitHub's five alerts with an icon, a color, and a title. Comark's built-in [alert plugin](https://comark.dev/plugins/defaults/alert) only tags the quote with its type.
- `references()` links `@user` to the profile and `#123` or `owner/name#123` to the issue or pull request, as GitHub does in comments.
- `html()` keeps the raw HTML GitHub allows and drops the rest, scripts included. Without it, Comark renders all raw HTML as written.
- References and the HTML GitHub allows render as plain elements, so your page's styles apply to them.

## Usage

Write Markdown as you would on GitHub.

::example
```md
> [!TIP]
> Thanks @onmax: press <kbd>⌘</kbd> <kbd>K</kbd> to search.
```
::

### Callouts

Use a quote whose first line is `[!TYPE]` to draw a callout. The body is any Markdown, over as many lines as it needs.

::example
```md
> [!NOTE]
> Drafts save every few seconds, so closing the tab keeps your work.
```
::

> [!NOTE]
> A quote marked with any other type, such as `[!INFO]`, stays a plain quote, and `meta.issues` names it.

#### Type

Use the type to say how much the reader needs the callout. The marker is case-insensitive.

| Type | Use it for |
| --- | --- |
| `NOTE` | Context the reader should know, even when skimming |
| `TIP` | A better or faster way to do something |
| `IMPORTANT` | Something the reader needs to succeed |
| `WARNING` | A risk that needs their attention now |
| `CAUTION` | An action with consequences they can't undo |

#### Title

Use text after the marker, on its line, to replace the callout's title.

::example
```md
> [!IMPORTANT] Decision
> Keep the existing endpoint. Clients pin its response shape.
```
::

### References

Use `@user`, `#123`, and `owner/name#123` in text to link to GitHub.

::example
```md
Thanks @onmax: this fixes #51, and onmax/comark-ui#73 builds on it.
```
::

| Written | Links to |
| --- | --- |
| `@user` | `https://github.com/user` |
| `#123` | `https://github.com/<repo>/issues/123`, when `repo` is set. GitHub redirects it to the pull request when it is one. |
| `owner/name#123` | `https://github.com/owner/name/issues/123` |

> [!NOTE]
> A reference must stand on its own, so `me@example.com`, `C#9`, and `@comark/html` stay text. So does anything in a link or in code. A bare `#123` needs the `repo` [option](#options).

### HTML

Use raw HTML as GitHub allows it. `html()` drops the rest.

::example
```md
Water is H<sub>2</sub>O. <script>alert("hi")</script>
```
::

These tags stay, as on GitHub: `a`, `abbr`, `b`, `bdo`, `blockquote`, `br`, `caption`, `cite`, `code`, `dd`, `del`, `details`, `dfn`, `div`, `dl`, `dt`, `em`, `figcaption`, `figure`, `h1` to `h6`, `hr`, `i`, `img`, `ins`, `kbd`, `li`, `mark`, `ol`, `p`, `picture`, `pre`, `q`, `rp`, `rt`, `ruby`, `s`, `samp`, `small`, `source`, `span`, `strike`, `strong`, `sub`, `summary`, `sup`, `table`, `tbody`, `td`, `tfoot`, `th`, `thead`, `time`, `tr`, `tt`, `ul`, `var`, and `wbr`.

- `html()` removes `script` and `style` with their content, and replaces any other tag, such as `iframe`, `form`, or a component's tag, with its content.
- Attributes that change the layout or describe the content stay, such as `align`, `width`, `height`, `alt`, `title`, `open`, `colspan`, and `aria-label`. So do `href` on links, `src` and `srcset` on images, and `srcset` and `media` on `source`. `class`, `id`, `style`, and event handlers such as `onclick` go.
- A URL must be relative, http, or https, or mailto in a link. Any other, such as `javascript:` or `data:`, is removed.

> [!NOTE]
> Markdown after a blank line inside an HTML element renders after the element, not inside it. Lines right after the opening tag, with no blank line, stay inside as plain text.

## Examples

### Callouts in another language

Use the `titles` option of `callouts()` to translate the default titles.

```ts
callouts({ titles: { note: "Nota", warning: "Aviso" } });
```

### Lists and code in a callout

A callout holds any Markdown, and works inside lists and other blocks too.

::example
````md
> [!WARNING] Breaking change in v2
> `render(markdown)` is gone. Create a renderer once instead:
>
> - pass it your `plugins` and `components`
> - key `components` by tag name
>
> ```ts
> const render = createHtmlRenderer({ plugins, components });
> ```
````
::

## API

### Options

Options go under `github` in `comarkUi()`, keyed by plugin, such as `comarkUi({ github: { references: { repo: "onmax/comark-ui" } } })`, or to each plugin when you use it alone. `false` for a plugin's options turns that plugin off, and `github: false` turns off all three.

#### callouts()

| Option | Default | Description |
| --- | --- | --- |
| `titles` | GitHub's: Note, Tip, Important, Warning, Caution | Titles for callouts that don't set their own, by type, such as `{ note: "Nota" }`. |

#### references()

| Option | Default | Description |
| --- | --- | --- |
| `repo` | — | The repository a bare `#123` points into, as `owner/name`. Without it, `#123` stays text, while `@user` and `owner/name#123` still link. |

#### html()

`html()` takes no options. [HTML](#html) lists the tags and attributes it keeps.

### Issues

The plugins add these problems to `meta.issues`, as [Validation](/guide/validation/) describes:

- A quote marked with a type other than GitHub's five, such as `[!INFO]`. It stays a plain quote.
- A `repo` that isn't `owner/name`. Until it's fixed, `#123` stays text.

Each has its own rule in [Doctor](/doctor/).

### Package

[comark-ui](/getting-started/) brings `comark-github` and registers its three plugins. To use it alone, install it, register the plugins you want, and pass the renderer's `components`:

```sh
pnpm add comark @comark/html comark-github
```

```ts
import { createHtmlRenderer } from "@comark/html";
import { callouts, components, html, references } from "comark-github/html";

const render = createHtmlRenderer({
  plugins: [callouts(), references({ repo: "onmax/comark-ui" }), html()],
  components,
});
```

`callouts()` replaces Comark's built-in alert plugin, and `html()` replaces its html plugin.

For Vue, React, or Svelte, import from `comark-github/vue`, `comark-github/react`, or `comark-github/svelte`. The callout components add the styles when they mount. On a server, import `comark-github/style.css` with your own styles so the page doesn't shift. [Renderers](/guide/renderers/) covers using it with other plugins.

## Theme

Callouts follow shadcn/ui's Alert, a bordered card with the icon in the type's color. The title mixes that color 70% with the foreground, so it reads as text on light and dark cards. The rules sit in a `comark` CSS layer, so any plain rule of yours wins.

### Shared tokens

| Token | Used for |
| --- | --- |
| `--comark-background` | The card |
| `--comark-muted` | The body |
| `--comark-border` | The card's border |
| `--comark-radius` | The card's corners |
| `--comark-font` | All text |

### Variables

Set them on `.cgc`. Each color goes to the type's icon and title.

| Variable | Default | Used for |
| --- | --- | --- |
| `--cgc-note` | `--comark-info` | `NOTE` |
| `--cgc-tip` | `--comark-success` | `TIP` |
| `--cgc-important` | `#7c3aed`, `#a78bfa` in dark mode | `IMPORTANT` |
| `--cgc-warning` | `--comark-warning` | `WARNING` |
| `--cgc-caution` | `--comark-danger` | `CAUTION` |

### Classes and attributes

| Selector | Is |
| --- | --- |
| `.cgc` | A callout, with `data-type`: `note`, `tip`, `important`, `warning`, or `caution` |
| `.cgc-icon` | The type's icon |
| `.cgc-title` | The title |
| `.cgc-body` | The body |

### Example

```css
.cgc {
  --cgc-note: oklch(0.55 0.2 260);
}
```
