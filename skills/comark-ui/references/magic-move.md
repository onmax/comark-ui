# Magic move

comark-magic-move animates code from one step to the next, as Shiki Magic Move does: the words and marks two steps share move to their new places, new ones fade in, and old ones fade out. Use it to tell a change to code one move at a time, such as a refactor in a tutorial.

## Syntax

````md
::magic-move{title="Extract the rate"}
```ts [Start]
const total = price * 2
```

```ts [Extract the rate]
const rate = 2
const total = price * rate
```
::
````

- `::magic-move`: every code block inside is one step, in order. Anything else inside is dropped and reported, and a block with fewer than two code blocks is reported too. `title` names the block for screen readers, default `Code steps`.
- The `[label]` after a fence's language names its step and shows above its code. It isn't a file name there.
- Arrows under the code page through the steps, and the arrow keys do too once a button has focus.
- Without the script, as in a feed reader, an email, or a screenshot of the page, the steps read one after another under their labels.

## Choose the steps

- Change one thing per step. When most of the code moves at once, the reader can't follow any of it.
- Keep the code that stays the same identical, spaces aside, so it moves rather than fading out and in.
- For a change a reviewer approves, write `::diff`: it shows every removed and added line at once, which an animation can't.

## Register

- In `comark-ui`: on, as `magicMove`, with no options.
- Alone: `pnpm add comark @comark/html comark-magic-move`, then `createHtmlRenderer({ plugins: [magicMove()], components })` with both from `comark-magic-move/html`. `comark-magic-move/vue`, `/react`, and `/svelte` export the same pair for those renderers.
