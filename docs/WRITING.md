# Writing docs pages

The pages follow the shape of [Nuxt UI](https://ui.nuxt.com/docs/components/button) and [Reka UI](https://reka-ui.com/docs/components/dialog): the demos first, one heading per prop, and the reference in tables at the end. `packages/zoom/docs/index.md` is the model page; copy its shape.

## A block's page

The sections, in this order. Leave out a section the block has nothing for.

1. **Frontmatter.** `tagline` is one sentence that says what the block is, such as "A view that zooms an image or any block out of the page." Its behavior goes in Features.
2. **`::examples`**, the demos, at the top. They stay as they are.
3. **`## Features`**: 3 to 6 bullets, one fact each, such as what works with no script or what a screen reader hears.
4. **`## Usage`**: one sentence and the smallest example that renders. Then one `###` per prop or attribute that changes the output, named by the prop's meaning ("Title", "Group", "Color"). Each starts "Use the `x` prop to …" and shows an `::example`, or a fenced code block when the output doesn't change visibly. Several components get one `###` each, with their props as `####`.
5. **`## Examples`**: one `###` per task, named by its goal ("Caption beside the zoom", "Close after an upload"), each a sentence and an example.
6. **`## Accessibility`**, for a block that takes focus or keys: what a screen reader hears and where focus goes, then `### Keyboard interactions` as a `| Key | Description |` table. Read the keys from the package's script.
7. **`## API`**:
   - `### Props` as `| Prop | Default | Description |`. List the values in the description, and write `—` when there is no default. With several components, one table each, under the component's name.
   - `### Options`, `### Events`, `### Slots`, `### Functions` in the same shape, when the block has them.
   - `### Issues`: the problems it adds to `meta.issues`, as a list, and a link to [Doctor](/doctor/).
   - `### Package`: installing and registering it alone. It stays last.
8. **`## Theme`**: shared tokens, variables, classes, and a worked example, as they are today.

Every fact on the page now has one place: a prop's sentence and example in Usage, its default and values in the Props table. A constraint that would make a reader's example fail, such as "`none` needs a `side`", goes in a `> [!NOTE]` right under its prop, and stays in the table's description too.

## Other pages

A guide, recipe, or Getting started page opens with one sentence on what the reader gets from it, uses the same `###`-per-step shape, and ends with links to the pages a reader goes to next.

## Tone

- Short sentences in the second person and present tense: "Use the `group` prop to page through several items."
- One idea per sentence and one topic per paragraph. Split a long paragraph into the list or table it already is.
- Say what a reader does or sees, then why when it isn't obvious.
- Callouts (`> [!NOTE]`, `> [!TIP]`, `> [!WARNING]`) for a fact that changes how a reader writes the block. No more than two per section.
- Keep every fact the page had; restructure it rather than dropping it. When a fact doesn't fit the shape, put it in Examples.
