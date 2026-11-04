<script setup lang="ts">
// `:::example`: the rendered Markdown, with its source a switch away. The parser put the rendered copy first.
defineProps<{ label?: string }>();
const view = ref<"preview" | "code">("preview");
</script>

<template>
  <div class="docs-example my-4 border border-default" :data-view="view">
    <div class="flex justify-end gap-1 border-b border-default p-1 text-xs">
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
