---
title: Magic move
description: Code that animates between steps, like Shiki Magic Move, written in Markdown.
keywords: shiki magic move, code animation, code transition, slidev, keynote magic move, refactor walkthrough, animated code
tagline: A code group whose tabs are steps, the tokens two steps share sliding to their new places.
group: Docs blocks
icon: wand-sparkles
blurb: Code that moves between steps
credits: 'The idea and the approach are <a href="https://antfu.me/posts/shiki-magic-move">Shiki Magic Move</a>''s, by Anthony Fu.'
---

::examples
:::example{label="Refactor"}
````md
::magic-move{title="Cache getUser"}
```ts [Fetch]
export async function getUser(id: string) {
  const res = await fetch(`/api/users/${id}`)
  return res.json()
}
```

```ts [Handle errors]
export async function getUser(id: string) {
  const res = await fetch(`/api/users/${id}`)
  if (!res.ok) throw new Error(`User ${id}: ${res.status}`)
  return res.json()
}
```

```ts [Cache]
const cache = new Map<string, Promise<User>>()

export function getUser(id: string) {
  if (!cache.has(id)) cache.set(id, load(id))
  return cache.get(id)!
}

async function load(id: string) {
  const res = await fetch(`/api/users/${id}`)
  if (!res.ok) throw new Error(`User ${id}: ${res.status}`)
  return res.json() as Promise<User>
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

- Every code block inside `::magic-move` is one step, with a tab named by the label after its language.
- The words and marks two steps share move to their new places; new ones fade in and old ones fade out.
- It reads the rendered code, so it works with Shiki or any other highlighter, or none.
- Without the script, the steps read one after another, each under its label.
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

Use the `[label]` after a fence's language to name its step's tab. A step without one is named by its position, such as Step 2.

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

Use the `title` prop to name the tabs for screen readers. The page doesn't show it.

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

The steps follow the [WAI-ARIA tabs pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/). The tabs are a tab list, named by the block's `title`, and each step is a tab panel named by its tab. Only the open tab is a tab stop, so `Tab` moves from it to the open step and then on.

When the reader prefers reduced motion, a tab opens its step without moving anything.

### Keyboard interactions

| Key | Description |
| --- | --- |
| `ArrowLeft`, `ArrowRight` | On a tab, opens the previous or next step, wrapping at either end. On a right-to-left page they follow the reading direction. |
| `Home`, `End` | On a tab, opens the first or last step. |
| `Tab` | Moves focus from the open tab to its step. |

## API

### Props

#### Magic move

| Prop | Default | Description |
| --- | --- | --- |
| `title` | — | The name screen readers read for the tabs. |

#### Code block

| Attribute | Default | Description |
| --- | --- | --- |
| `[label]` | `Step 1`, `Step 2`, … | The name of the step's tab. |

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

The tabs follow the shared tokens in [Theming](/guide/theming/), and two variables of its own set the header and the space between steps. The code keeps its highlighter's colors. The rules sit in a `comark` CSS layer, so a plain rule of your own wins over any of them.

### Shared tokens

| Token | Used for |
| --- | --- |
| `--comark-background` | The open tab |
| `--comark-foreground` | The open and hovered tabs' text |
| `--comark-muted` | The other tabs' text, and the captions without the script |
| `--comark-border` | The header's border |
| `--comark-accent` | The header's surface |
| `--comark-ring` | The focus ring |
| `--comark-radius` | The corners |

### Variables

Set these on `.cmv` or any ancestor, such as `:root`:

| Variable | Default | Used for |
| --- | --- | --- |
| `--cmv-surface` | `--comark-accent` at 50% | The header behind the tabs |
| `--cmv-gap` | `1rem` | The space between steps when they read in turn, without the script |

### Classes and attributes

| Selector | Is |
| --- | --- |
| `.cmv` | The block |
| `.cmv-list` | The tabs, shown once the script runs |
| `.cmv-tab` | A tab, with `aria-selected="true"` when its step is open |
| `.cmv-stage` | The steps |
| `.cmv-step` | Each step, with `data-inactive` on every step but the open one |
| `.cmv-caption` | A step's label above its code, shown without the script |
| `.cmv-t` | A word or mark the script cut from the code, on the first move |
| `[data-magic-move-ready]` | On `<html>` once the script runs; without it every step shows |

### Example

A header that matches the code block:

```css
:root {
  --cmv-surface: var(--comark-background);
}
```

To try it, paste it into Extra CSS in the [playground's Theme pane](/play/#preset=magic-move-refactor).
