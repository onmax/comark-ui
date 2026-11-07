<script setup lang="ts">
// `:::example`: the rendered Markdown, with its source a switch away, and a link that opens it in the playground. The
// parser put the rendered copy first and wrote the link. It looks as it did on the old site (docs/style.css before #351).
import { indicate } from "../../../seg.ts";

defineProps<{ label?: string; play?: string }>();
// `::examples` passes the view in, so a tab keeps it when the reader moves to the next one.
const view = defineModel<"preview" | "code">("view", { default: "preview" });
const seg = useTemplateRef<HTMLElement>("seg");
let stop: (() => void) | undefined;
onMounted(() => (stop = seg.value ? indicate(seg.value) : undefined));
onBeforeUnmount(() => stop?.());
</script>

<template>
  <div class="docs-example" :data-view="view">
    <div class="docs-example-bar">
      <a v-if="play" :href="play" class="docs-example-play">
        <UIcon name="i-lucide-flask-conical" class="size-3.25" />Playground
      </a>
      <div ref="seg" class="docs-seg" role="group" aria-label="View">
        <button type="button" :aria-pressed="view === 'preview'" @click="view = 'preview'">
          Preview
        </button>
        <button type="button" :aria-pressed="view === 'code'" @click="view = 'code'">Code</button>
      </div>
    </div>
    <div class="docs-example-content"><slot /></div>
  </div>
</template>

<style>
.docs-example {
  --ex-fg: var(--ui-text-highlighted);
  --ex-muted: var(--ui-text-muted);
  --ex-faint: var(--ui-text-dimmed);
  --ex-line: var(--ui-border);
  --ex-soft: var(--ui-bg-elevated);
  --ex-raised: var(--ui-bg);
  margin: 1.25rem 0;
}

.dark .docs-example {
  --ex-raised: var(--ui-bg-accented);
}

.docs-example-bar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.docs-example-play {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  color: var(--ex-faint);
  font-size: 0.75rem;
  font-weight: 500;
  text-decoration: none;
  transition: color 150ms ease;
}

.docs-example-play:hover {
  color: var(--ex-fg);
}

/* A switch: one soft track and a raised thumb on the choice, with no lines between them. */
.docs-seg {
  position: relative;
  display: inline-flex;
  padding: 3px;
  border-radius: 10px;
  background: var(--ex-soft);
}

.docs-seg button {
  position: relative;
  z-index: 1;
  padding: 0.2rem 0.65rem;
  border-radius: 6px;
  color: var(--ex-muted);
  font-size: 0.75rem;
  font-weight: 500;
  line-height: 1.5;
  cursor: pointer;
  transition: color 150ms ease;
}

.docs-seg button:hover,
.docs-seg [aria-pressed="true"] {
  color: var(--ex-fg);
}

.docs-seg [aria-pressed="true"],
.docs-seg .indicator {
  background: var(--ex-raised);
  box-shadow:
    0 0 0 0.5px rgb(0 0 0 / 0.06),
    0 1px 3px rgb(0 0 0 / 0.1);
}

.docs-seg[data-indicator] [aria-pressed="true"] {
  background: none;
  box-shadow: none;
}

.docs-seg .indicator {
  position: absolute;
  top: 3px;
  bottom: 3px;
  left: 0;
  border-radius: 6px;
  pointer-events: none;
  transition:
    transform 200ms cubic-bezier(0.23, 1, 0.32, 1),
    width 200ms cubic-bezier(0.23, 1, 0.32, 1);
}

.docs-seg .indicator[data-still] {
  transition: none;
}

.docs-seg button:focus-visible {
  outline: 2px solid var(--ex-fg);
  outline-offset: -2px;
}

@media (pointer: coarse) {
  .docs-seg button,
  .docs-example-play {
    min-height: 2.5rem;
  }
}

.docs-example[data-view="preview"] > .docs-example-content > :not(.docs-example-preview),
.docs-example[data-view="code"] > .docs-example-content > .docs-example-preview {
  display: none;
}

/* The code is a code block, which draws its own frame. A preview of text sits in one soft ring, with the content's own
   margins trimmed at its edges. */
.docs-example[data-view="code"] > .docs-example-content > * {
  margin: 0;
}

.docs-example-preview {
  padding: 1.25rem 1.5rem;
  border-radius: 10px;
  box-shadow: 0 0 0 1px var(--ex-line);
}

.docs-example-preview > :nth-child(1 of :not(style, script)) {
  margin-top: 0;
}

.docs-example-preview > :nth-last-child(1 of :not(style, script)) {
  margin-bottom: 0;
}

/* A block that draws its own frame carries `data-comark-frame` and isn't framed again: a preview that holds only such
   blocks drops its ring and padding, and stacks them with a gap. A block drawn on the server sits in a `.comark-html`
   named after it, and a screenshot or a comparison counts as framed too. */
.docs-example-preview:not(
  :has(
    > :not(
      style,
      script,
      [data-comark-frame],
      .comark-html:is(
        [data-block="screenshot"],
        [data-block="compare"],
        [data-block="diff"],
        [data-block="question"],
        [data-block="poll"],
        [data-block="recall"]
      )
    )
  )
),
.docs-example-preview:has(> p > :is(.cm-video, .cm-audio)) {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 0;
  border-radius: 0;
  box-shadow: none;
}

.docs-example-preview > :is(.ca, [data-comark-frame]),
.docs-example-preview > .comark-html > :is(.ca, .cd, .cqz) {
  margin-block: 0;
}

.docs-example-preview > .ck > pre {
  margin-block: 0;
}
</style>
