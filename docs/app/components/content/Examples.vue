<script setup lang="ts">
// `::examples`: one tab per `:::example`, as the old site's tab row.
import { computed, useSlots, type VNode } from "vue";

const slots = useSlots();
const items = computed(() =>
  (slots.default?.() ?? []).filter((node: VNode) => typeof node.type === "object"),
);
const labels = computed(() =>
  items.value.map((node, at) => String(node.props?.label ?? `Example ${at + 1}`)),
);
const active = ref(0);
</script>

<template>
  <div class="docs-examples" data-examples>
    <div role="tablist" class="flex gap-2 border-b border-default">
      <button
        v-for="(label, at) in labels"
        :key="label"
        type="button"
        role="tab"
        :aria-selected="at === active"
        class="px-2 py-1 text-sm"
        :class="at === active ? 'border-b-2 border-inverted font-medium' : 'text-muted'"
        @click="active = at"
      >
        {{ label }}
      </button>
    </div>
    <component :is="item" v-for="(item, at) in items" v-show="at === active" :key="at" />
  </div>
</template>
