---
title: Editor
description: Edit Comark Markdown with Tiptap, bind it to Vue, and share the document through a collaboration codec.
keywords: WYSIWYG, rich text, ProseMirror
tagline: A Tiptap editor for Comark Markdown, with Vue bindings, file uploads, and a codec for collaborative rooms.
---

Use `comark-ui/editor` to edit Comark documents and save them back to Markdown. [Open the editor playground](/play/editor/) to edit Markdown and rich text side by side, or use the [Markdown playground](/play/) to preview the rendered plugins.

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

The editor shows the frontmatter above the text as read-only [Properties](/properties/) rows. Pass Properties' options in `properties`, or `:properties="false"` to hide them.

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

`checkMarkdown(markdown, { plugins })` checks that the editor can read and write the document without losing structure or changing the rendered text. It returns `{ editable: true, markdown }` with the normalized Markdown, or `{ editable: false }`. If the frontmatter is the problem, `reason` says which: the block is empty, holds YAML comments, isn't `key: value` lines, isn't valid YAML, or has a `__proto__` key at any depth that a room's fields would drop.

Pass the plugins you render with, or the check misses syntax only they read. The Vue bindings run it and open a failing document read-only. A passing check doesn't promise byte-for-byte output.

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

The component nodes keep a block's structure and editable content. Add your own Tiptap node views to draw it as your app does.

`ComarkImage` plays video and audio URLs it recognizes by extension in native players, and keeps images inline. `ComarkKit` includes it and the other exported nodes: `ComarkBlock`, `ComarkInline`, `ComarkSlot`, `ComarkComment`, `FootnoteReference`, `InlineFootnote`, `FootnoteDefinition`, `DefinitionList`, `DefinitionTerm`, `DefinitionDescription`, and `CriticComment`, and the marks `CriticInsertion`, `CriticDeletion`, and `CriticHighlight`.

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

Pass `[upload]` to `<ComarkEditor :extensions="[upload]" />` or the composable's `extensions` option. Each file shows a placeholder until the callback resolves. A rejected upload removes it and calls `onError`.

The callback's second argument reports progress as a fraction from 0 to 1. `fetch` doesn't report upload progress, so use `XMLHttpRequest.upload.onprogress` for it. `accept(file)` limits which files the editor takes.

The placeholder is a local decoration, so a collaborative document never holds a half-uploaded file. Hosts that work at the ProseMirror level can use `uploadPlugin(options)`, `startUploads(view, files, pos, options)`, `findUpload(state, id)`, and `uploadKey`.

## Collaborative rooms

`createEditorCodec({ plugins, kit })` from `comark-ui/editor` shares the schema and Markdown conversion between a server and its editors. The codec fits ViteHub Realtime's `editor` option.

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

Pass your renderer's plugins for the same check as `checkMarkdown()`. The codec gives the document format, and your host supplies room storage, transport, and a collaboration extension.

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

Build a room's [Properties](/properties/) rows from its fields with `rowsOf(fields, options)` from comark-properties. They stay read-only, since the editor doesn't edit fields yet.

## Vue options

| Option | Used by | Description |
| --- | --- | --- |
| `extensions` | Component and composable | Extra Tiptap extensions added after `ComarkKit`, such as `Upload`. |
| `plugins` | Component and composable | Parse plugins that check the document before editing. |
| `kit` | Composable | `ComarkKitOptions`, including StarterKit configuration. |
| `modelValue` | Component | The Markdown string, bound with `v-model`. Changes emit `update:modelValue`. |
| `properties` | Component | `PropertiesOptions` for the read-only rows above the text, or `false` to hide them. Default `true`. |

## Next steps

[Installation](/getting-started/) registers the blocks for rendering, [Renderers](/guide/renderers/) displays the saved Markdown, and [Validation](/guide/validation/) checks documents for authoring problems.
