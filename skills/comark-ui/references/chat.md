# comark-chat

Renders AI SDK `UIMessage` parts in Vue, React, or Svelte: text as streaming Comark Markdown, images and files, and each run of reasoning, tool calls, and sources as one trace that folds open to the thought or the call's input, output, and error. It renders only. The app sends, stores, and lays out messages, for example with `useChat()`.

## Render a message

```vue
<script setup lang="ts">
import { MessageParts } from "comark-chat/vue";
</script>

<template>
  <MessageParts :parts="message.parts" :streaming="isLast && status === 'streaming'" />
</template>
```

- `streaming` marks the message that is still arriving: the last thought reads "Thinking" and text shows a caret.
- `plugins`, `components`, and `options` go to every Markdown part, so `comarkUi()`'s plugins let the model write the same blocks as documents.
- Vue slots, React's `render` functions, and Svelte snippets replace a kind of part: `text`, `reasoning`, `tool`, `source`, `file`, `step`, and `fallback` for other parts, such as `data-*` parts, which render nothing without it. Vue and React also take `part`, which replaces any part. Each gets what `read()` made of the part, with `index` and `part`. `markdown` gets `{ value, streaming }` and replaces the Markdown of text and reasoning, for an app with its own Markdown component.
- `read(parts, streaming)` from `comark-chat` is what every renderer uses. It never throws; tool values become JSON text, and only http, https, named data, and blob image URLs become links or images.

## Register

- In `comark-ui`: not included. `comark-ui` renders documents; install `comark-chat` next to it and pass `comarkUi()`'s `plugins` and `components` to `MessageParts`.
- Alone: `pnpm add comark-chat @comark/vue` (or `@comark/react`, `@comark/svelte`), then import `MessageParts` from `comark-chat/vue`, `/react`, or `/svelte`. The components add their styles on mount; a server-rendered page also imports `comark-chat/style.css`.
