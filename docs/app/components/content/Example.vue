<script setup lang="ts">
// `:::example`: the rendered Markdown, with its source a switch away, and a link that opens it in the playground. The
// parser put the rendered copy first and wrote the link.
defineProps<{ label?: string; play?: string }>();
const view = ref<"preview" | "code">("preview");
</script>

<template>
  <div class="docs-example my-4 border border-default" :data-view="view">
    <div class="flex items-center justify-end gap-1 border-b border-default p-1 text-xs">
      <a
        v-if="play"
        :href="play"
        class="me-2 inline-flex items-center gap-1 font-medium text-dimmed transition-colors hover:text-highlighted"
      >
        <UIcon name="i-lucide-flask-conical" class="size-3.5" />Playground
      </a>
      <button
        type="button"
        :aria-pressed="view === 'preview'"
        class="px-2"
        @click="view = 'preview'"
      >
        Preview
      </button>
      <button type="button" :aria-pressed="view === 'code'" class="px-2" @click="view = 'code'">
        Code
      </button>
    </div>
    <div class="docs-example-content p-4"><slot /></div>
  </div>
</template>

<style scoped>
.docs-example[data-view="preview"] > .docs-example-content > :deep(:not(.docs-example-preview)),
.docs-example[data-view="code"] > .docs-example-content > :deep(.docs-example-preview) {
  display: none;
}
</style>
