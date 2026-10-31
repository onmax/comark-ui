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

A message is a list of parts. `MessageParts` renders each one: text as Markdown through `@comark/vue`, `@comark/react`, or `@comark/svelte`, which closes unfinished syntax while the text streams; images and files; and each run of reasoning, tool calls, and sources as one trace, a list of quiet lines that fold open to the thought or the call's input, output, and error.

It renders and nothing else. Your app sends messages, stores them, and lays out the conversation, with `useChat()` or anything that keeps AI SDK `UIMessage`s.

## Usage

Pass the parts, and `streaming` for the message that is still arriving. A streaming reasoning reads "Thinking" and text shows a caret.

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

Each slot gets what `read()` made of its part, with `index` and the original `part`. `part` replaces any part; the others replace their kind: `text`, `reasoning`, `tool`, `source`, `file`, `step` for AI SDK's `step-start`, and `fallback` for any other part, such as your `data-*` parts, which render nothing without it.

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

`markdown` gets `{ value, streaming }` and replaces how every text and reasoning part renders its Markdown, for an app that already has a Markdown component with its own plugins and styles.

React takes the same functions in `render`, and returns `undefined` from one to keep the default. Svelte takes them as snippets.

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

A tool's `status` is `running`, `waiting` for one that needs the user's approval, `error`, or `done`. Its title is the tool's name with dashes and underscores as spaces, or a dynamic tool's `title`. Values are JSON; a cyclic one shows `[Circular]`, and one that throws shows `[Value cannot be shown]`. A link is offered only for http and https URLs and, for a named file, data URLs, and an image only for those, data images, and blob URLs.

### Package

```sh
pnpm add comark-chat @comark/vue
```

Use `@comark/react` or `@comark/svelte` for those frameworks, with `comark-chat/react` or `comark-chat/svelte`. The components add their styles on mount; on a server-rendered page, import `comark-chat/style.css` too.

## Theme

Messages read the `--comark-*` tokens like the other plugins, and errors read Nuxt UI's `--ui-error`, then shadcn/ui's `--destructive`. Every class starts with `cht-`.
