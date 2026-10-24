# comark-badge

[![npm version](https://npmx.dev/api/registry/badge/version/comark-badge)](https://npmx.dev/package/comark-badge)
[![npm downloads](https://npmx.dev/api/registry/badge/downloads-month/comark-badge)](https://npmx.dev/package/comark-badge)
[![install size](https://npmx.dev/api/registry/badge/size/comark-badge)](https://npmx.dev/package/comark-badge)
[![license](https://npmx.dev/api/registry/badge/license/comark-badge)](https://npmx.dev/package/comark-badge)
[![docs](https://img.shields.io/badge/docs-comark--ui.onmax.me-14b8a6?labelColor=0a0a0a)](https://comark-ui.onmax.me/badge/)

Badges for versions and statuses, inline as `:badge[deprecated]{color="warning"}` or as Nuxt UI's block `::badge`, in Nuxt UI's seven colors. A [Comark](https://comark.dev) plugin for HTML, Vue, React, and Svelte.

```sh
pnpm add comark comark-badge
```

```ts
import { createHtmlRenderer } from "@comark/html";
import badge, { components } from "comark-badge/html";

const render = createHtmlRenderer({ plugins: [badge()], components });
```

```md
## useAsyncData :badge[deprecated]{color="warning"}

::badge
**v4.0.0**
::
```

`color` is one of `primary`, the default, `secondary`, `success`, `info`, `warning`, `error`, and `neutral`. The plugin adds every problem to `meta.issues`, so a host can reject a document before publishing it: an unknown color, which shows as primary, and an empty badge. Each issue names its badge and says how to fix it.

## Renderers

| Renderer | Import |
| --- | --- |
| `@comark/html` | `comark-badge/html`: the styles are inlined once per document |
| `@comark/vue` | `comark-badge/vue` |
| `@comark/react` | `comark-badge/react` |
| `@comark/svelte` | `comark-badge/svelte` |

Each entry exports the parse plugin as `default` and the renderer's `components`. The Vue, React, and Svelte components add the styles when they mount; import `comark-badge/style.css` with your styles so a server-rendered page doesn't shift.

Each color reads Nuxt UI's variable, such as `--ui-primary`, when the page has it, so badges match a Nuxt UI app; otherwise primary follows shadcn/ui's `--primary`, or the text color, and error `--destructive`. Complete CSS colors and legacy bare HSL shadcn/ui tokens are supported. Set `--cb-*` to change a color and the shared `--comark-*` tokens to theme every plugin at once; the rules sit in a `comark` CSS layer, so any plain rule of your own wins.
