# Citations and sources

comark-sources turns `:cite[n]` into a numbered link to the nth source in the document's `::sources` list, and gives each source a link back to every citation of it. Use it when the claims in a document rest on links, such as the research behind a change.

## Syntax

```md
Pigeons find home by the sun and by the earth's magnetic field :cite[1], and some by smell too :cite[2,3].

::sources
1. [Magnetoreception in homing pigeons](https://en.wikipedia.org/wiki/Magnetoreception)
2. [Olfactory navigation](https://en.wikipedia.org/wiki/Pigeon_intelligence), on smell
3. [How do homing pigeons navigate?](https://www.sciencefocus.com/nature/how-do-homing-pigeons-navigate)
::
```

- `:cite[2]` cites the second source, and `:cite[1,3]` several. Each becomes a superscript `[1]` that links to its source. Hovering or focusing it shows a card with the source's title, its site, and the icon the list shows for it, a globe when there's none. Put a space before `:cite`, which the plugin removes; `word:cite[1]` stays text, and nothing reports it.
- `::sources` holds one numbered list with one source per item, each with its link. Sources count by their place in the list. Text after the link, such as `, on smell`, stays in the item. `title` names the list, "Sources" by default. The plugin drops anything beside the list and reports it.
- A document has one `::sources`, anywhere in it, and citations before and after it both count. A citation of a number the list doesn't have, a source with no link, and a second list are reported.

## Register

- In `comark-ui`: on. It takes no options.
- Alone: `pnpm add comark @comark/html comark-sources`, then `createHtmlRenderer({ plugins: [sources()], components })` with both from `comark-sources/html`. `comark-sources/vue`, `/react`, and `/svelte` render it too. Citations are plain `sup` links that work in any renderer, and the `sources` component draws the list and carries the styles for both. It has no options. The HTML renderer inlines the card's script once per document, and the components start it when they mount.
