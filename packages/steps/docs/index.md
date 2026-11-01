---
title: Steps
description: Numbered steps, written in Markdown.
keywords: tutorial, procedure, numbered list, walkthrough, how-to, stepper, timeline
tagline: Numbered steps down a line, made from the headings of a tutorial or a numbered list.
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

## Features

- Each heading starts a step that holds everything up to the next one.
- The heading keeps its `id`, so links to it and the page's table of contents still work.
- A numbered list inside makes one step of each item, as Starlight's `<Steps>` does.
- Without the styles, the steps read as a numbered list.
- It's Nuxt UI's `::steps`, so a page renders the same under Nuxt UI. No script.

## Usage

Wrap the `###` headings of a tutorial in `::steps`.

::example
```md
::steps
### Install
Run `pnpm add comark-steps`.

### Register
Pass `steps()` to the parser.
::
```
::

### Level

Use the `level` prop to set the heading level that starts each step, from 2 to 6. It defaults to 3, for `###`. Deeper headings stay inside their step.

::example
```md
::steps{level="2"}
## Install
Run `pnpm add comark-steps`.

## Register
Pass `steps()` to the parser.
::
```
::

> [!NOTE]
> A `level` outside 2 to 6 falls back to 3 and adds an issue.

### Numbered list

Use one numbered list as the block's only content to make one step of each item. A list that starts past 1 keeps its number.

::example
```md
::steps
3. Open a pull request.
4. Wait for review.
::
```
::

## Examples

### Anchors and the table of contents

A step's heading stays a heading with the same `id`, so `#install` links, a table of contents built from the document, and comark-linter's anchor check see it as before.

### Steps inside a step

A `:::steps` inside a step keeps its own headings and numbers:

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

### Props

| Prop | Default | Description |
| --- | --- | --- |
| `level` | `3` | The level of the headings that start each step, from 2 to 6. A value outside that falls back to 3 and adds an issue. |

### Options

The plugin takes no options. In `comarkUi()`, `steps: false` turns it off.

### Your own renderer

The parse plugin replaces the block with a `steps` node holding one `step` per step, and writes each step's number as `index`, counted from the list's `start`:

```json
["steps", { "start": "3" }, ["step", { "index": "3" }, "Open a pull request."]]
```

`start` is there only when the steps start past 1. A component for `step` gets the step's heading and everything after it as its content.

### Issues

The plugin adds these to `meta.issues`, as [Validation](/guide/validation/) describes:

- Content before the first heading renders above the steps.
- A block with no headings at its `level` and no numbered list renders as plain content. When its headings are at another level, the issue names the `level` to write.
- A `level` outside 2 to 6 falls back to 3.
- A prop other than `level`, such as `start`, is ignored.

Each names its block and the fix, and has its own rule in [Doctor](/doctor/).

### Package

comark-ui installs and registers `comark-steps`. To use it alone, install it:

```sh
pnpm add comark @comark/html comark-steps
```

Register the plugin and pass the renderer's `components`:

```ts
import { createHtmlRenderer } from "@comark/html";
import steps, { components } from "comark-steps/html";

const render = createHtmlRenderer({ plugins: [steps()], components });
```

For Vue, React, or Svelte, import from `comark-steps/vue`, `comark-steps/react`, or `comark-steps/svelte`. The components add the styles on mount. When you render on a server, also import `comark-steps/style.css` so the page doesn't shift. [Renderers](/guide/renderers/) covers using it with other plugins.

## Theme

Steps follow the shared tokens in [Theming](/guide/theming/).

### Shared tokens

| Token | Used for |
| --- | --- |
| `--comark-foreground` | The numbers |
| `--comark-border` | The circles and the line |
| `--comark-accent` | Inside the circles |
| `--comark-font` | The numbers |

### Classes

| Selector | Is |
| --- | --- |
| `.cs` | The steps, an `<ol>` |
| `.cs-step` | Each step, an `<li>`, numbered with the CSS counter `cs-step` in a circle on `::before`, and joined to the next by a line on `::after` |

### Important rules

The rules sit in a `comark` CSS layer, so any plain rule of yours wins, except the margins that keep a step's content against the line. A step's block margins, its first child's top margin, and its last child's bottom margin are `!important`, since a page's unlayered heading and list margins would leave a gap the line can't cross. To override them, use `!important` too.
