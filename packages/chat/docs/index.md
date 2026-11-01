---
title: Chat
description: AI SDK chat messages rendered with Comark, in Vue, React, and Svelte.
keywords: ai sdk, useChat, UIMessage, message parts, tool calls, reasoning, llm, streaming, assistant
tagline: Render an AI SDK message's parts, streaming Markdown, files, and a trace of each turn's reasoning, tool calls, and sources, with the plugins your documents use.
group: Chat
icon: message-square
blurb: AI SDK messages
---

```vue
<script setup lang="ts">
import { useChat } from "@ai-sdk/vue";
import { MessageParts } from "comark-chat/vue";

const { messages, status } = useChat();
</script>

<template>
  <article v-for="(message, index) in messages" :key="message.id">
    <MessageParts
      :parts="message.parts"
      :streaming="status === 'streaming' && index === messages.length - 1"
    />
  </article>
</template>
```

`MessageParts` renders each part of a message:

- Text as Markdown through `@comark/vue`, `@comark/react`, or `@comark/svelte`, closing unfinished syntax while it streams.
- Images and files.
- Each run of reasoning, tool calls, and sources as one trace. Its lines fold open to the thought, or to a call's input, output, and error.

It only renders. Your app sends, stores, and lays out messages, with `useChat()` or anything that keeps AI SDK `UIMessage`s.

## Usage

Pass the parts, and `streaming` for the message still arriving. While it streams, reasoning reads "Thinking" and text shows a caret.

### Your plugins in messages

`plugins`, `components`, and `options` go to every Markdown part, the thoughts included, so a model can write the same blocks as your documents:

```vue
<script setup lang="ts">
import { MessageParts } from "comark-chat/vue";
import comarkUi from "comark-ui/vue";

const { plugins, components } = comarkUi();
</script>

<template>
  <MessageParts :parts="message.parts" :plugins :components />
</template>
```

### Replace a kind of part

Each slot gets what `read()` made of its part, with `index` and the original `part`. The `part` slot replaces any part. The others replace one kind each: `text`, `reasoning`, `tool`, `source`, `file`, `step` for AI SDK's `step-start`, and `fallback` for any other part. Your `data-*` parts render nothing without `fallback`.

```vue
<MessageParts :parts="message.parts">
  <template #tool="{ title, state, part }">
    <ToolCard :title :state :call="part" />
  </template>
  <template #fallback="{ part }">
    <Progress v-if="part.type === 'data-progress'" :value="part.data" />
  </template>
</MessageParts>
```

The `markdown` slot gets `{ value, streaming }` and renders the Markdown of every text and reasoning part, for an app that already has a Markdown component.

React takes the same slots as functions in `render`. Return `undefined` from one to keep the default. Svelte takes them as snippets.

```tsx
import { MessageParts } from "comark-chat/react";

<MessageParts parts={message.parts} render={{ tool: (step) => <ToolCard step={step} /> }} />;
```

## API

### `read(parts, streaming?)`

Use `read()` from `comark-chat` to build your own renderer. It returns the blocks in order and never throws, whatever the parts hold:

| Block | What it holds |
| --- | --- |
| `text` | `text`, and `streaming` when the part or the message is still arriving. |
| `trace` | `steps`: each `reasoning` (`title` "Thinking" or "Thought", `status`), `tool` (`title`, `status`, `state` in words, and `values`, the input, output, and error as text), and `source` (`title`, `href`). |
| `file` | `name`, `mediaType`, `href` for a link the browser may open, `download`, and `image` for an image the page may load. |
| `step-start`, `other` | The part, for the `step` and `fallback` slots. |

A tool's `status` is `running`, `waiting` for the user's approval, `error`, or `done`. Its title is the tool's name with dashes and underscores as spaces, or a dynamic tool's `title`. Values show as JSON. A cyclic one shows `[Circular]`, and one that throws shows `[Value cannot be shown]`. Only http and https URLs, and a named file's data URL, get a link. Images load only from http and https, data image, and blob URLs.

### Package

```sh
pnpm add comark-chat @comark/vue
```

For React or Svelte, install `@comark/react` or `@comark/svelte` and import from `comark-chat/react` or `comark-chat/svelte`. The components add their styles on mount. On a server-rendered page, also import `comark-chat/style.css`.

## Theme

Messages read the `--comark-*` tokens like the other plugins, and errors read Nuxt UI's `--ui-error`, then shadcn/ui's `--destructive`. Every class starts with `cht-`.
