---
title: Editor
description: Edit Comark Markdown with Tiptap, bind it to Vue, and share the document through a collaboration codec.
keywords: WYSIWYG, rich text, ProseMirror
tagline: A Tiptap editor for Comark Markdown, with Vue bindings, file uploads, and a codec for collaborative rooms.
---

Use `comark-ui/editor` to edit Comark documents and save them back to Markdown.

[Open the editor playground](/play/editor/) to edit Markdown and rich text side by side, or use the [Markdown playground](/play/) to preview the rendered plugins.

## Setup

### Install the editor

Install comark-ui and the editor's Tiptap peer dependencies:

```sh
pnpm add comark comark-ui @tiptap/core @tiptap/pm @tiptap/starter-kit @tiptap/extension-list @tiptap/extension-image @tiptap/extension-table
```

For the Vue binding, also install `vue` and `@tiptap/vue-3`.

### Bind a Vue component

Import `ComarkEditor` from `comark-ui/editor/vue` and bind a Markdown string with `v-model`. Pass the parse plugins your document renders with so the editor can check whether it can preserve their syntax.

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

Mount the editor in the browser. In Nuxt, put it inside `<ClientOnly>`. `ComarkEditor` renders Tiptap's `EditorContent`; your app supplies the toolbar and styles.

### Use the composable

Use `useComarkEditor(markdown, options)` from `comark-ui/editor/vue` when you need the Tiptap instance. It returns `editor`, a shallow ref that is empty until the document loads, and `editable`, a ref that says whether the document can be saved.

```ts
import { ref } from "vue";
import { useComarkEditor } from "comark-ui/editor/vue";

const markdown = ref("# Release notes\n");
const { editor, editable } = useComarkEditor(markdown);

function bold() {
  if (editable.value) editor.value?.chain().focus().toggleBold().run();
}
```

Call the composable inside a Vue setup scope. It destroys the editor when that scope ends. Edits update the Markdown ref, and changes to the ref reload the document.

## Markdown conversion

`fromMarkdown(markdown)` and `toMarkdown(doc, options)` from `comark-ui/editor` convert between Markdown and Tiptap JSON without a DOM, so they run on a server too.

```ts
import { fromMarkdown, toMarkdown } from "comark-ui/editor";

const { doc, frontmatter, lossy } = await fromMarkdown("# Release notes\n");
if (!lossy) {
  const markdown = await toMarkdown(doc, { frontmatter });
}
```

`fromMarkdown()` returns an `EditorDocument` with `doc`, `frontmatter`, and `lossy`. Keep the frontmatter beside the document and pass it to `toMarkdown()` when saving. `lossy` means the schema cannot preserve something in the source; use `checkMarkdown()` for the full check before allowing edits.

### Check before editing

`checkMarkdown(markdown, { plugins })` checks whether the editor can read and write the document without losing its structure or changing the text the plugins render. It returns `{ editable: true, markdown }` with the normalized Markdown, or `{ editable: false }`.

Pass the same parse plugins you use to render the document. Syntax only those plugins read, such as a third-party plugin's, otherwise escapes the check. The Vue bindings run this check and open a document read-only when it fails.

The editor may normalize Markdown formatting. A successful check does not promise byte-for-byte preservation.

### What the editor keeps

The editor reads and writes all of comark-ui's syntax, so a document that uses it opens editable:

- Every block and inline component, with its props and slots, written flush and with its props on its own line. A component written `:name{}` alone on its line stays that way.
- Quiz options, as tasks with the `>` rationale under each.
- GitHub callouts, with the title on the marker line.
- Footnotes, by the labels their author picked, and inline notes.
- CriticMarkup: insertions, deletions, substitutions, highlights, and comments.
- Definition lists, and emphasis next to Chinese, Japanese, and Korean punctuation.

The first save normalizes formatting without changing the document: it pads table cells, quotes attribute values, and puts a blank line between blocks. It refuses ordered task lists and HTML comments inside a paragraph, because the schema has nowhere to keep them.

## Schema

`ComarkKit` from `comark-ui/editor` combines Tiptap's StarterKit with task lists, inline images, tables, footnotes, definition lists, CriticMarkup, and Comark components, slots, and comments. It preserves Comark attributes that have no editor field, through the clipboard too.

Use `[ComarkKit]` as the extensions of a Tiptap editor you create yourself. Pass StarterKit options through `ComarkKit.configure({ starterKit: { ... } })`. Underline stays off because Comark has no underline syntax.

The component nodes preserve a block's structure and editable content. Supply your own Tiptap node views to draw a block as it appears in your app.

`ComarkImage` draws video and audio URLs as native players for the file extensions the editor recognizes. Images stay inline. The other exported nodes are `ComarkBlock`, `ComarkInline`, `ComarkSlot`, `ComarkComment`, `FootnoteReference`, `InlineFootnote`, `FootnoteDefinition`, `DefinitionList`, `DefinitionTerm`, `DefinitionDescription`, and `CriticComment`, and the marks `CriticInsertion`, `CriticDeletion`, and `CriticHighlight`; `ComarkKit` already includes them.

## File uploads

Add `Upload` from `comark-ui/editor` to the editor's `extensions`. It handles pasted and dropped images, video, and audio. Supply an `upload(file, progress)` callback that returns the uploaded file's URL.

For example, an endpoint at `/api/uploads` can accept a file and return `{ url }`:

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

Pass `[upload]` to `<ComarkEditor :extensions="[upload]" />` or to the composable's `extensions` option. Each file gets a placeholder until the callback resolves. A rejected upload removes its placeholder and calls `onError`.

The callback's second argument reports progress as a fraction from 0 to 1. Use it with `XMLHttpRequest.upload.onprogress` when you need byte progress; `fetch` does not report upload progress. Use `accept(file)` to restrict which files the editor takes.

The placeholder is a local decoration, so collaborative documents never contain a file that has not finished uploading. `uploadPlugin(options)`, `startUploads(view, files, pos, options)`, `findUpload(state, id)`, and `uploadKey` are exported for hosts that integrate at the ProseMirror level.

## Collaborative rooms

Use `createEditorCodec({ plugins, kit })` from `comark-ui/editor` to share the schema and Markdown conversion between a server and its editors. The returned codec fits ViteHub Realtime's `editor` option.

```ts
import { createEditorCodec } from "comark-ui/editor";

const codec = createEditorCodec();
const markdown = "# Release notes\n";
const result = await codec.verify(markdown);
if (result.writable) {
  const doc = await codec.fromMarkdown(markdown);
  const saved = await codec.toMarkdown(doc);
}
```

Pass your renderer's plugins for the same preservation check as `checkMarkdown()`. The codec provides the document format; your host supplies room storage, transport, and a collaboration extension.

| Method | Returns |
| --- | --- |
| `extensions()` | The shared Tiptap extensions, with StarterKit's undo history and trailing paragraph disabled by default for collaboration. |
| `fromMarkdown(markdown)` | The document as Tiptap JSON. |
| `toMarkdown(doc)` | The document as Markdown. |
| `verify(markdown)` | `{ writable: true, canonical }` when the room can save the document, or `{ writable: false }`. |

A collaborative room holds only the body. `verify()` refuses documents whose parsed frontmatter contains keys. This does not guarantee preservation of empty or comment-only blocks: comment-only frontmatter can pass verification and be omitted on save. Hosts that need to preserve those blocks must reject them before opening a writable room.

## Vue options

| Option | Used by | Description |
| --- | --- | --- |
| `extensions` | Component and composable | Extra Tiptap extensions added after `ComarkKit`, such as `Upload`. |
| `plugins` | Component and composable | Parse plugins used to check the document before editing. |
| `kit` | Composable | `ComarkKitOptions`, including StarterKit configuration. |
| `modelValue` | Component | The Markdown string, bound with `v-model`; changes emit `update:modelValue`. |

## Next steps

[Installation](/getting-started/) registers the blocks for rendering. [Renderers](/guide/renderers/) shows how to display the saved Markdown. [Validation](/guide/validation/) checks documents for authoring problems.
