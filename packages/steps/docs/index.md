---
title: Steps
description: Numbered steps, written in Markdown.
keywords: tutorial, procedure, numbered list, walkthrough, how-to, stepper, timeline
tagline: Turn the headings of a tutorial, or a numbered list, into numbered steps down a line. Nuxt UI's syntax, with no script.
group: Docs blocks
icon: list-ordered
blurb: Numbered steps
credits: 'Syntax from <a href="https://ui.nuxt.com/docs/typography">Nuxt UI</a>''s prose steps, and the numbered-list form from <a href="https://starlight.astro.build/components/steps/">Starlight</a>.'
---

::examples
:::example{label="Headings"}
````md
::steps
### Install the plugin
```sh
pnpm add comark-steps
```

### Register it
Pass `steps()` to the parser and `components` to the renderer.

### Write the steps
Wrap the headings of a tutorial in `::steps`.
::
````
:::

:::example{label="Numbered list"}
```md
::steps
1. Fork the repository and clone it.
2. Run `pnpm install`.
3. Open a pull request against `main`.
::
```
:::
::

Each heading starts a step that holds everything up to the next one. The heading keeps its `id`, so links to it and the page's table of contents still work. Without the styles, the steps read as a numbered list.

## Usage

### Headings

```md
::steps{level="2"}
## Install
Run `pnpm add comark-steps`.

## Register
Pass `steps()` to the parser.
::
```

| Prop | What it does |
| --- | --- |
| `level` | The level of the headings that start each step, from 2 to 6. Defaults to 3, so `###` headings. Deeper headings stay inside their step. |

This is Nuxt UI's `::steps`, unchanged, so a page renders the same steps under Nuxt UI.

### A numbered list

```md
::steps
3. Open a pull request.
4. Wait for review.
::
```

A block whose only content is a numbered list makes one step of each item, as Starlight's `<Steps>` does. A list that starts past 1 keeps its number.

### Issues

The plugin adds every problem to `meta.issues`, as [Validation](/guide/validation/) describes:

- Content before the first heading renders above the steps.
- A block with no headings at its `level` and no numbered list renders as plain content. When its headings are at another level, the issue names the `level` to write.
- A `level` outside 2 to 6 falls back to 3.
- A prop other than `level`, such as `start`, is ignored.

Each issue names its block and says how to fix it. Each one has its own rule in [Doctor](/doctor/).

## Examples

### Anchors and the table of contents

The heading that starts a step stays a heading inside it, with the same `id`, so `#install` links, a table of contents built from the document, and comark-linter's anchor check all see it as before.

### Steps inside a step

A `:::steps` inside a step keeps its own headings and its own numbers:

::example
```md
::steps
### Set up the database
:::steps{level="4"}
#### Start Postgres
#### Run the migrations
:::

### Start the server
Run `pnpm dev`.
::
```
::

## API

The plugin takes no options. In `comarkUi()`, `steps: false` turns it off.

### Your own renderer

The parse plugin replaces the block with a `steps` node holding one `step` per step, and writes each step's number as `index`, counted from the list's `start`:

```json
["steps", { "start": "3" }, ["step", { "index": "3" }, "Open a pull request."]]
```

`start` is there only when the steps start past 1. A component for `step` gets everything after the heading as its content, the heading included.

### Package

comark-ui brings `comark-steps` and registers it. To use it alone, install it:

```sh
pnpm add comark @comark/html comark-steps
```

Register the plugin and pass the renderer's `components`:

```ts
import { createHtmlRenderer } from "@comark/html";
import steps, { components } from "comark-steps/html";

const render = createHtmlRenderer({ plugins: [steps()], components });
```

For Vue, React, or Svelte, import from `comark-steps/vue`, `comark-steps/react`, or `comark-steps/svelte`. The components add the styles when they mount. When you render on a server, import `comark-steps/style.css` with your own styles so the page doesn't shift. [Renderers](/guide/renderers/) covers using it with other plugins.

## Theme

Steps are an `<ol class="cs">` of `<li class="cs-step">`, numbered with the CSS counter `cs-step` in a circle on `::before`, and joined by a line on `::after`. They read these [shared tokens](/guide/theming/):

| Token | Used for |
| --- | --- |
| `--comark-foreground` | The numbers |
| `--comark-border` | The circles and the line |
| `--comark-accent` | Inside the circles |
| `--comark-font` | The numbers |

The rules sit in a `comark` CSS layer, so any plain rule of your own wins.
