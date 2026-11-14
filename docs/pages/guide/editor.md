---
title: Editor
description: Edit Comark Markdown with Tiptap, bind it to Vue, and share the document through a collaboration codec.
keywords: WYSIWYG, rich text, ProseMirror
tagline: A Tiptap editor for Comark Markdown, with Vue bindings, file uploads, and a codec for collaborative rooms.
---

Use `comark-ui/editor` to edit Comark documents and save them back to Markdown. [Open the editor playground](/play/editor) to edit Markdown and rich text side by side, or use the [Markdown playground](/play) to preview the rendered plugins.

## Setup

### Install the editor

Install comark-ui and the editor's Tiptap peer dependencies:

```sh
pnpm add comark comark-ui @tiptap/core @tiptap/pm @tiptap/starter-kit @tiptap/extension-list @tiptap/extension-image @tiptap/extension-table
```

For the Vue binding, also install `vue` and `@tiptap/vue-3`.

### Bind a Vue component

Import `ComarkEditor` from `comark-ui/editor/vue` and bind a Markdown string with `v-model`. Pass the parse plugins you render with, so the editor can check it keeps their syntax.

```vue
<script setup lang="ts">
import { ref } from "vue";
import comarkUi from "comark-ui/vue";
import { ComarkEditor } from "comark-ui/editor/vue";

const markdown = ref("# Release notes\n\nWrite **here**.\n");
const { plugins } = comarkUi({ chips: { download: false }, icon: { fetch: false } });
</script>

<template>
  <ComarkEditor v-model="markdown" :plugins="plugins" />
</template>
```

The editor shows the frontmatter above the text as read-only [Properties](/properties) rows. Pass Properties' options in `properties`, or `:properties="false"` to hide them.

Mount the editor in the browser, inside `<ClientOnly>` in Nuxt. `ComarkEditor` renders Tiptap's `EditorContent`, and your app supplies the toolbar and styles.

### Use the composable

Use `useComarkEditor(markdown, options)` from `comark-ui/editor/vue` when you need the Tiptap instance. It returns:

- `editor`, a shallow ref, empty until the document loads.
- `editable`, a ref that says whether you can save the document.
- `frontmatter`, which the editor writes back on each save.

```ts
import { ref } from "vue";
import { useComarkEditor } from "comark-ui/editor/vue";

const markdown = ref("# Release notes\n");
const { editor, editable } = useComarkEditor(markdown);

function bold() {
  if (editable.value) editor.value?.chain().focus().toggleBold().run();
}
```

Call it inside a Vue setup scope. It destroys the editor when the scope ends. Edits update the Markdown ref, and changing the ref reloads the document.

## Components

The Vue bindings draw every block and inline component with a shared view. A block shows its name and props in a bar above its content, and an inline component a tag after its text. Slots stay editable in place under their `#name`.

Click the props in the bar, or the tag, to open the props panel. It edits the component's props through Tiptap transactions on the node, so the schema and the Markdown the codec writes don't change, and the view works in a collaborative room.

### Describe your components

Use the `components` option to give a component a label, an icon, and typed props. The panel draws a field for each one, and lists any other prop the document sets as a name and a value.

```ts
import { useComarkEditor, type ComponentInfo } from "comark-ui/editor/vue";

const components: Record<string, ComponentInfo> = {
  chart: {
    label: "Chart",
    icon: "i-lucide-chart-bar",
    props: {
      type: { options: ["bar", "stacked", "line"], default: "bar" },
      title: {},
      labels: { type: "boolean", description: "Prints the numbers on the chart." },
    },
  },
};

const { editor } = useComarkEditor(markdown, { components });
```

A component you don't list shows its name, and the panel edits its props as text. It writes text under `name` and every other value under `:name`, as Comark reads it back:

| `type` | Field | Written as |
| --- | --- | --- |
| `string`, the default | A text input, or a select with `options` | `title="Done"` |
| `number` | A number input | `:max="5"` |
| `boolean` | A checkbox. Unchecked removes the prop, unless its `default` is `true`. | `labels` |
| `json` | A text area, applied when the JSON parses | `:rows='[1,2]'` |

Any other `type`, such as `image`, edits as text until a `field` draws it. `default` shows in an empty field and is never written. `icon` takes a class, such as an UnoCSS icon's, or a Vue component.

### comark-ui's blocks

`componentInfo(options)` from `comark-ui/info` describes every block the preset reads with those options: its `kind`, `label`, a one-sentence `description`, typed `props`, and named `slots`. Pass it the options you render with, and the editor knows every block a document can hold:

```ts
import { componentInfo } from "comark-ui/info";

const options = { typeset: false, chips: false };
const { editor } = useComarkEditor(markdown, { components: componentInfo(options) });
```

It's plain data, so a server can build it too, such as for ViteHub's `documents({ components })`. Each preset returns the same map as `componentInfo`, without the blocks its renderer doesn't draw. A package used alone exports its own map as `componentInfo` from its `/info` entry, such as `comark-embed/info`. Spread your own entries over it to add icons.

### Draw your own fields

Use the `field` option to draw a prop's field, such as a media picker. It gets the `component` and prop `name`, the prop's entry in `prop`, its `value`, `editable`, the `id` its label points at, and `update(value)`, which sets the prop. `update(undefined)` removes it. Return `undefined` to keep the panel's own field.

```ts
import { h } from "vue";

useComarkEditor(markdown, {
  components: { card: { props: { image: { type: "image" } } } },
  field: (field) =>
    field.prop.type === "image"
      ? h(MediaPicker, {
          id: field.id,
          value: field.value,
          disabled: !field.editable,
          "onUpdate:value": field.update,
        })
      : undefined,
});
```

`ComarkEditor` takes `components` as a prop and `field` as a slot: `<template #field="field">`. Pass `components: false` to draw components as bare elements.

### Use the view in your own editor

`componentView(options)` from `comark-ui/editor/vue` returns the Tiptap node view, with the same `components` and `field`. Pass it to `ComarkKit`, or to a collaboration codec's `kit`, in the browser only:

```ts
import { createEditorCodec } from "comark-ui/editor";
import { componentView } from "comark-ui/editor/vue";

const codec = createEditorCodec({ kit: { componentView: componentView({ components }) } });
```

The server's codec leaves it out and builds the same schema. Mount the editor with `EditorContent` from `@tiptap/vue-3`, since Tiptap draws a Vue node view only there. The view adds its styles to the page with the first component, on the `--comark-*` [theme tokens](/guide/theming), in light and dark. Its classes start with `cev-`.

## Markdown conversion

`fromMarkdown(markdown)` and `toMarkdown(doc, options)` from `comark-ui/editor` convert between Markdown and Tiptap JSON without a DOM, so they run on a server too.

```ts
import { fromMarkdown, toMarkdown } from "comark-ui/editor";

const { doc, frontmatter, lossy } = await fromMarkdown("# Release notes\n");
if (!lossy) {
  const markdown = await toMarkdown(doc, { frontmatter });
}
```

`fromMarkdown()` returns an `EditorDocument` with `doc`, `frontmatter`, and `lossy`. Pass the `frontmatter` back to `toMarkdown()` when you save. `lossy` means the schema can't keep something in the source. Run `checkMarkdown()` for the full check before you allow edits.

### Check before editing

`checkMarkdown(markdown, { plugins, registerDefaultPlugins })` checks that the editor can read and write the document without changing what your page renders: it parses the document before and after a save with your parser options and compares the trees. It returns `{ editable: true, markdown }` with the normalized Markdown, or `{ editable: false }`. If the frontmatter is the problem, `reason` says which: the block is empty, holds YAML comments, isn't `key: value` lines, isn't valid YAML, or has a `__proto__` key at any depth that a room's fields would drop.

Pass the options you render with, or the check misses syntax only your plugins read. If your parser sets `registerDefaultPlugins: false`, pass that too: the editor then reads bare URLs and HTML as your page does, as text unless your plugins include Comark's `linkify` or `html`, so a save doesn't turn a bare URL into a link. Ids that plugins such as comark-tabs derive from a hash of the source don't count. The Vue bindings run the check and open a failing document read-only. A passing check doesn't promise byte-for-byte output.

### What the editor keeps

The editor reads and writes all of comark-ui's syntax, so these open editable:

- Every block and inline component, with its props and slots, written flush and with its props on its own line. A component written `:name{}` alone on its line stays that way.
- Quiz options, as tasks with the `>` rationale under each.
- GitHub callouts, with the title on the marker line.
- Footnotes, by the labels their author picked, and inline notes.
- CriticMarkup: insertions, deletions, substitutions, highlights, and comments.
- Definition lists, and emphasis next to Chinese, Japanese, and Korean punctuation.

Without changing the document, the first save pads table cells, quotes attribute values, and puts a blank line between blocks. The editor refuses ordered task lists and HTML comments inside a paragraph, since the schema has nowhere to keep them.

## Schema

`ComarkKit` from `comark-ui/editor` combines Tiptap's StarterKit with task lists, inline images, tables, footnotes, definition lists, CriticMarkup, and Comark components, slots, and comments. It keeps Comark attributes that have no editor field, through the clipboard too.

Pass `[ComarkKit]` as the extensions of your own Tiptap editor, and StarterKit options through `ComarkKit.configure({ starterKit: { ... } })`. Underline stays off, since Comark has no underline syntax.

The component nodes keep a block's structure and editable content. Pass a node view in `componentView`, such as [the Vue bindings' view](#components), to draw them.

`ComarkImage` plays video and audio URLs it recognizes by extension in native players, and keeps images inline. `ComarkKit` includes it and the other exported nodes: `ComarkBlock`, `ComarkInline`, `ComarkSlot`, `ComarkComment`, `FootnoteReference`, `InlineFootnote`, `FootnoteDefinition`, `DefinitionList`, `DefinitionTerm`, `DefinitionDescription`, and `CriticComment`, and the marks `CriticInsertion`, `CriticDeletion`, and `CriticHighlight`.

## Code blocks

### Color the code

Add `CodeHighlight` from `comark-ui/editor` to color code blocks with the same Shiki your page renders with. Configure it with the object you pass the preset as `shiki`, its `highlighter` and `themes`, from [Code highlighting](/getting-started#code-highlighting):

```ts
import { CodeHighlight } from "comark-ui/editor";

// Your Shiki, as in Getting started's Code highlighting section.
const shiki = {
  highlighter: async (language: string) => (language in grammars ? highlighter : undefined),
  themes: { light: "github-light", dark: "github-dark" },
};
const { plugins } = comarkUi({ shiki });
const { editor } = useComarkEditor(markdown, {
  plugins,
  extensions: [CodeHighlight.configure(shiki)],
});
```

The colors are decorations, so the document, its Markdown, and a collaborative room stay plain, and a server's codec doesn't need the extension. A block's language loads the first time a block uses it, and the block colors once it arrives. A language the highlighter returns `undefined` for, or whose grammar fails, stays plain until the editor is created again, so typing never asks for it twice. The code follows dark mode like the page's: under a `.dark` class, or in the system's dark mode unless a `.light` class is set.

### Pick the language

`CodeLanguageSelect` from `comark-ui/editor/vue` puts a select in the top right corner of each code block. Choosing a language sets the block's `language`, which a room syncs like any edit, and "Plain text" removes it. Place it beside `EditorContent`, in an element with `position: relative`:

```vue
<script setup lang="ts">
import { EditorContent } from "@tiptap/vue-3";
import { CodeLanguageSelect } from "comark-ui/editor/vue";

const languages = { typescript: "TypeScript", bash: "Bash", json: "JSON" };
const aliases: Record<string, string> = { ts: "typescript", sh: "bash" };
const language = (info: string) => {
  const name = info.trim().split(/\s/)[0];
  return aliases[name] ?? (name in languages ? name : undefined);
};
</script>

<template>
  <div v-if="editor" class="relative">
    <EditorContent :editor="editor" />
    <CodeLanguageSelect :editor="editor" :languages="languages" :language="language" />
  </div>
</template>
```

`languages` lists the languages it offers by name, with the label each shows, sorted by label. `language(info)` gives the name a block's language stands for, so a block written `ts` shows TypeScript. Without it, a block's first word must be a name in `languages`. A language the select doesn't offer shows as written.

The selects sit over the editor rather than inside it, so ProseMirror's DOM stays as the schema draws it. Give your code blocks room at the top, such as `padding-top: 2rem` on `pre`, so the select doesn't cover the first line. Its classes start with `cel-`.

To draw your own select, such as your design system's, use the `#select` slot. It gets the block's `language`, the language as `written`, whether the editor is `editable`, and `choose(language)`, where `null` makes the block plain text:

```vue
<CodeLanguageSelect :editor="editor" :languages="languages">
  <template #select="{ language, written, editable, choose }">
    <MySelect
      :model-value="language"
      :placeholder="written ?? 'Plain text'"
      :disabled="!editable"
      @update:model-value="choose"
    />
  </template>
</CodeLanguageSelect>
```

## File uploads

Add `Upload` from `comark-ui/editor` to the editor's `extensions` to take pasted and dropped images, video, and audio. Its `upload(file, progress)` callback returns the uploaded file's URL. Here an endpoint at `/api/uploads` takes a file and returns `{ url }`:

```ts
import { Upload } from "comark-ui/editor";

const upload = Upload.configure({
  async upload(file) {
    const body = new FormData();
    body.append("file", file);
    const response = await fetch("/api/uploads", { method: "POST", body });
    if (!response.ok) throw new Error("Upload failed");
    const { url } = await response.json();
    return url;
  },
  onError(error, file) {
    console.error(`Could not upload ${file.name}`, error);
  },
});
```

Pass `[upload]` to `<ComarkEditor :extensions="[upload]" />` or the composable's `extensions` option. Each file shows a placeholder with a preview and its percentage until the callback resolves. A rejected upload removes it and calls `onError`. The editor adds the placeholder's styles to the page with the first one, on the `--comark-*` tokens.

For an Image item in a "/" menu or a toolbar, run the `chooseFiles` command. It opens the file picker and uploads the files picked at the cursor, with the same placeholders:

```ts
editor.chain().focus().deleteRange(range).chooseFiles().run();
```

`pick` sets the types the picker offers, as an `<input accept>` value. It's `image/*,video/*,audio/*` by default.

The callback's second argument reports progress as a fraction from 0 to 1. `fetch` doesn't report upload progress, so use `XMLHttpRequest.upload.onprogress` for it. `accept(file)` limits which files the editor takes.

The placeholder is a local decoration, so a collaborative document never holds a half-uploaded file. Hosts that work at the ProseMirror level can use `uploadPlugin(options)`, `startUploads(view, files, pos, options)`, `chooseFiles(view, options)`, `findUpload(state, id)`, `uploadKey`, and `uploadCss`.

## Collaborative rooms

`createEditorCodec({ plugins, registerDefaultPlugins, kit })` from `comark-ui/editor` shares the schema and Markdown conversion between a server and its editors. The codec fits ViteHub Realtime's `editor` option.

A room holds a document in two parts. The body is the editor's document, bound through Tiptap's collaboration extension. The frontmatter is the room's fields, a map such as a `Y.Map` with one value per key. Text edits never touch the fields. When two people change different keys at once, both changes stay. On the same key, one value wins in every editor.

```ts
import { createEditorCodec } from "comark-ui/editor";

const codec = createEditorCodec();
const { body, fields } = codec.split(storedMarkdown);
const result = await codec.verify(body);
if (result.writable) {
  const doc = await codec.fromMarkdown(body);
  // Seed the room with `doc` as its body and `fields` as its fields, then, on each save:
  const saved = codec.join({ body: await codec.toMarkdown(doc), fields });
}
```

Pass your parser's `plugins` and `registerDefaultPlugins`, so the room reads a document as your page does and `verify()` runs the same check as `checkMarkdown()`. The codec gives the document format, and your host supplies room storage, transport, and a collaboration extension.

| Method | Returns |
| --- | --- |
| `extensions()` | The shared Tiptap extensions. StarterKit's undo history and trailing paragraph are off by default, for collaboration. |
| `split(markdown)` | `{ body, fields }`, the stored file's body and its frontmatter as a plain object. Frontmatter a save couldn't write back stays in `body`. |
| `join({ body, fields })` | The file to store, with the fields as YAML frontmatter above the body. |
| `fromMarkdown(markdown)` | The body as Tiptap JSON. |
| `toMarkdown(doc)` | The body as Markdown, without frontmatter. |
| `verify(markdown)` | `{ writable: true, canonical }` when the room can save the body, else `{ writable: false }`. Its `issues` say why when the frontmatter is the problem. |

`verify()` refuses a body that still starts with frontmatter, since the room would drop it on the first save. Split the file first. Frontmatter that `split()` leaves in the body opens read-only too, because a save would drop or rewrite it. The issue gives the same reasons as `checkMarkdown()`, and it finds a `__proto__` key in mappings inside lists too.

A host that stores frontmatter apart, such as ViteHub Content, needs no `split()` or `join()`. A host that keeps the whole file as the body and skips them opens any document with frontmatter read-only.

Build a room's [Properties](/properties) rows from its fields with `rowsOf(fields, options)` from comark-properties. They stay read-only, since the editor doesn't edit fields yet.

## Vue options

| Option | Used by | Description |
| --- | --- | --- |
| `extensions` | Component and composable | Extra Tiptap extensions added after `ComarkKit`, such as `Upload`. |
| `plugins` | Component and composable | The parse plugins your page renders with, for the check before editing. |
| `registerDefaultPlugins` | Component and composable | `false` when your parser leaves out Comark's defaults, so the editor reads bare URLs and HTML as your page does. |
| `kit` | Composable | `ComarkKitOptions`, including StarterKit configuration and a `componentView` that replaces the view. |
| `components` | Component and composable | A `ComponentInfo` per component name, for the [component view](#components), or `false` to draw components as bare elements. Read once, when the editor is created. |
| `field` | Composable | Draws a typed prop's field. `ComarkEditor` takes it as the `#field` slot. |
| `modelValue` | Component | The Markdown string, bound with `v-model`. Changes emit `update:modelValue`. |
| `properties` | Component | `PropertiesOptions` for the read-only rows above the text, or `false` to hide them. Default `true`. |

## Next steps

[Installation](/getting-started) registers the blocks for rendering, [Renderers](/guide/renderers) displays the saved Markdown, and [Validation](/guide/validation) checks documents for authoring problems.
