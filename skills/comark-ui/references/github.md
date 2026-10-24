# GitHub callouts, references, and HTML

comark-github renders three parts of GitHub's Markdown as GitHub does: `> [!NOTE]` alerts as callouts with an icon and a title, `@user` and `#123` as links, and raw HTML cut down to the tags GitHub allows. Use a callout for the one thing a reader must not miss, and write references and HTML as you would in a GitHub comment.

## Syntax

````md
> [!WARNING] Breaking change
> `render(markdown)` is gone. Create a renderer once with `createHtmlRenderer()` and reuse it.

Thanks @onmax: this fixes #51, and onmax/comark-ui#73 builds on it.

<details>
<summary>Test output</summary>

```txt
✓ test/callouts.test.ts (12 tests) 41ms
```

</details>
````

- Callouts: `[!NOTE]`, `[!TIP]`, `[!IMPORTANT]`, `[!WARNING]`, or `[!CAUTION]` at the start of a quote's first line, in any case. Text after the marker on that line is the title, as plain text; without it the title is the type, such as Warning. The body is any Markdown on the quote's next lines, and a callout can sit in a list. Any other marker, such as `[!INFO]`, leaves a plain quote that shows the marker, and is reported.
- References: `@user` links to `https://github.com/user`, `owner/name#123` to that issue or pull request, and a bare `#123` into the host's `repo`. With no `repo`, `#123` stays text. A reference must stand alone, so `me@example.com`, `C#9`, `@comark/html`, and anything in a link or in code are never references.
- Raw HTML keeps GitHub's tags, such as `details`, `summary`, `kbd`, `sub`, `sup`, `img`, `picture`, and tables, and the attributes that set the layout or describe the content, such as `width`, `align`, `alt`, `title`, and `open`. `script` and `style` go with their content. Any other tag, such as `iframe`, `form`, or `video`, gives way to its content, so write a recording as an image for comark-media. `class`, `id`, `style`, and event handlers go. A URL must be relative, http, or https, or mailto in a link. Blocks written as Markdown, such as `::screenshot`, are untouched.

## Choose the callout

| Type | Use it for |
| --- | --- |
| `NOTE` | Context the reader should know, even when skimming |
| `TIP` | A better or faster way to do something |
| `IMPORTANT` | Something the reader needs to succeed |
| `WARNING` | A risk that needs their attention now |
| `CAUTION` | An action with consequences they can't undo |

## Collapse long output

Put a long log or a full test run in a `<details>`, with a `<summary>` that says what it holds, so the page stays short. Leave a blank line after `</summary>`, which GitHub needs to render the Markdown inside, and another before `</details>`. After a list, a `</details>` with no blank line before it joins the list, and the next block lands inside the details.

## Register

- In `comark-ui`: all three are on. Pass `github: { references: { repo: "owner/name" } }` so a bare `#123` links. `github: { callouts: { titles: { note: "Nota" } } }` renames the default titles for a site in another language, and `github: { html: false }` renders raw HTML as written. comark-chips runs first there, so `@user` renders as its avatar chip.
- Alone: `pnpm add comark @comark/html comark-github`, then `createHtmlRenderer({ plugins: [callouts(), references({ repo: "owner/name" }), html()], components })` with all four from `comark-github/html`. It has no default export, so register the plugins you want, in any order; only callouts use `components`. `callouts()` takes the place of Comark's built-in alert plugin and `html()` of its html plugin, even under `registerDefaultPlugins: false`. `comark-github/vue`, `/react`, and `/svelte` render it too. A `repo` that isn't `owner/name` is reported, and `#123` stays text.
