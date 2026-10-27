---
title: Magic move
description: Code that animates between steps, like Shiki Magic Move, written in Markdown.
keywords: shiki magic move, code animation, code transition, slidev, keynote magic move, refactor walkthrough, animated code
tagline: Code blocks that move into each other, the tokens two steps share sliding to their new places.
group: Docs blocks
icon: wand-sparkles
blurb: Code that moves between steps
credits: 'The idea and the approach are <a href="https://antfu.me/posts/shiki-magic-move">Shiki Magic Move</a>''s, by Anthony Fu.'
---

::examples
:::example{label="Refactor"}
````md
::magic-move{title="Extract the rate"}
```ts [Start]
const total = price * 2
```

```ts [Extract the rate]
const rate = 2
const total = price * rate
```

```ts [Wrap it in a function]
const rate = 2

export function total(price: number) {
  return price * rate
}
```
::
````
:::

:::example{label="Config"}
````md
::magic-move{title="Add a plugin"}
```ts [Before]
export default defineConfig({
  plugins: [vue()],
})
```

```ts [After]
import magicMove from "comark-magic-move"

export default defineConfig({
  plugins: [vue(), magicMove()],
})
```
::
````
:::
::

## Features

- Every code block inside `::magic-move` is one step, and the label after its language names it.
- The words and marks two steps share move to their new places; new ones fade in and old ones fade out.
- It reads the rendered code, so it works with Shiki or any other highlighter, or none.
- Without the script, the steps read one after another under their labels.
- With reduced motion, the step changes without moving anything.

## Usage

Write two or more code blocks inside `::magic-move`:

::example
````md
::magic-move
```ts
const total = price * 2
```

```ts
const total = price * rate
```
::
````
::

### Labels

Use the `[label]` after a fence's language to name its step. The label shows above the step's code.

::example
````md
::magic-move
```ts [Start]
const total = price * 2
```

```ts [Use the rate]
const total = price * rate
```
::
````
::

### Title

Use the `title` prop to name the block for screen readers. The page doesn't show it.

```md
::magic-move{title="Extract the rate"}
```

## Examples

### Keep what stays the same

Code that stays the same in two steps moves; code that changes fades. Change one thing per step and keep the rest identical, so the reader can follow each move.

::example
````md
::magic-move
```ts [One argument]
greet(name)
```

```ts [Two arguments]
greet(name, { formal: true })
```
::
````
::

### Review a change instead

An animation shows one step at a time, so a reviewer can't see every removed and added line at once. For a change someone approves, write a [`::diff`](/diff/).

## Accessibility

The block is a region that screen readers announce as code steps, named by its `title`, or "Code steps" without one. Each step is a group named by its position, such as "2 of 3".

The counter is a polite live region, so screen readers read the new position after each step. The arrows are buttons named "Previous step" and "Next step". At either end an arrow is marked disabled but keeps its focus, so the keys keep working.

### Keyboard interactions

| Key | Description |
| --- | --- |
| `ArrowLeft`, `ArrowRight` | On an arrow, shows the previous or next step. On a right-to-left page they follow the reading direction. |
| `Enter`, `Space` | On an arrow, shows the previous or next step. |

## API

### Props

#### Magic move

| Prop | Default | Description |
| --- | --- | --- |
| `title` | `"Code steps"` | The name screen readers read. |

#### Code block

| Attribute | Default | Description |
| --- | --- | --- |
| `[label]` | — | The step's name, shown above its code. |

### Options

comark-magic-move takes no options. `magicMove: false` in `comarkUi()` turns it off.

### Issues

The plugin adds a problem with any `::magic-move` to `meta.issues`, as [Validation](/guide/validation/) describes:

```txt
magic-move 1 has one code block, so there's nothing to move between; add a code block for each step, or use a plain code block.
```

It reports:

- A block with fewer than two code blocks.
- Content that isn't a code block. It's dropped.
- A prop it doesn't know.

Each one has its own rule in [Doctor](/doctor/).

### Package

comark-ui brings `comark-magic-move` and registers it. To use it alone, install it and pass the renderer's `components`:

```sh
pnpm add comark @comark/html comark-magic-move
```

```ts
import { createHtmlRenderer } from "@comark/html";
import magicMove, { components } from "comark-magic-move/html";

const render = createHtmlRenderer({ plugins: [magicMove()], components });
```

For Vue, React, or Svelte, import from `comark-magic-move/vue`, `comark-magic-move/react`, or `comark-magic-move/svelte`. When you render on a server, import `comark-magic-move/style.css` with your own styles. [Renderers](/guide/renderers/) covers the rest.

## Theme

The arrows and counter follow the shared tokens in [Theming](/guide/theming/), and two variables of its own set the space and the sizes. The code keeps its highlighter's colors. The rules sit in a `comark` CSS layer, so a plain rule of your own wins over any of them.

### Shared tokens

| Token | Used for |
| --- | --- |
| `--comark-background` | The arrows' faces |
| `--comark-foreground` | The arrows' icons |
| `--comark-muted` | The labels and the counter |
| `--comark-border` | The arrows' borders |
| `--comark-accent` | Hovered arrows |
| `--comark-ring` | The focus ring on the arrows |

### Variables

Set these on `.cmv` or any ancestor, such as `:root`:

| Variable | Default | Used for |
| --- | --- | --- |
| `--cmv-gap` | `1rem` | The space between steps when they read in turn, without the script |
| `--cmv-button-size` | `2rem` | The arrows' width and height, at least `2.5rem` on touch screens |

### Classes and attributes

| Selector | Is |
| --- | --- |
| `.cmv` | The block |
| `.cmv-stage` | The steps |
| `.cmv-step` | Each step, with `data-inactive` on every step but the one shown |
| `.cmv-label` | A step's label |
| `.cmv-t` | A word or mark the script cut from the code, on the first move |
| `.cmv-controls` | The row under the code, shown once the script runs |
| `.cmv-count` | The position, such as `1 / 3` |
| `.cmv-button` | An arrow, with `aria-disabled="true"` at either end |
| `[data-magic-move-ready]` | On `<html>` once the script runs; without it every step shows |

### Example

Bigger arrows:

```css
:root {
  --cmv-button-size: 2.5rem;
}
```

To try it, paste it into Extra CSS in the [playground's Theme pane](/play/#preset=magic-move-refactor).
