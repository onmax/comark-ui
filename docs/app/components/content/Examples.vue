<script setup lang="ts">
// `::examples`: one tab per `:::example`, as on the old site. Each example's Preview/Code switch shares the tab row, and
// only the chosen tab is underlined. The examples share one view, so Code stays on when the reader changes tabs.
import { computed, useSlots, type VNode } from "vue";
import { indicate } from "../../../seg.ts";

const slots = useSlots();
const items = computed(() =>
  (slots.default?.() ?? []).filter((node: VNode) => typeof node.type === "object"),
);
const labels = computed(() =>
  items.value.map((node, at) => String(node.props?.label ?? `Example ${at + 1}`)),
);
const active = ref(0);
const view = ref<"preview" | "code">("preview");
const tabs = useTemplateRef<HTMLElement>("tabs");
let stop: (() => void) | undefined;
onMounted(() => (stop = tabs.value ? indicate(tabs.value, "[aria-selected=true]") : undefined));
onBeforeUnmount(() => stop?.());
</script>

<template>
  <div class="docs-examples">
    <div ref="tabs" role="tablist" class="docs-tablist">
      <button
        v-for="(label, at) in labels"
        :key="label"
        type="button"
        role="tab"
        :aria-selected="at === active"
        @click="active = at"
      >
        {{ label }}
      </button>
    </div>
    <component
      :is="item"
      v-for="(item, at) in items"
      v-show="at === active"
      :key="at"
      v-model:view="view"
    />
  </div>
</template>

<style>
.docs-examples {
  position: relative;
  margin: 2.5rem 0 1.5rem;
}

/* The tabs stop short of the Playground link and the switch beside them, and scroll when there are more. */
.docs-tablist {
  position: relative;
  display: flex;
  gap: 1.25rem;
  margin: 0 15.5rem 0.75rem 0;
  overflow-x: auto;
  scrollbar-width: none;
}

.docs-tablist button {
  flex: none;
  padding: 0.5rem 0;
  border-bottom: 1px solid transparent;
  color: var(--ui-text-dimmed);
  font-size: 0.875rem;
  font-weight: 500;
  line-height: 1.5;
  cursor: pointer;
  transition:
    color 150ms ease,
    border-color 150ms ease;
}

.docs-tablist button:hover,
.docs-tablist [aria-selected="true"] {
  color: var(--ui-text-highlighted);
}

.docs-tablist [aria-selected="true"] {
  border-bottom-color: var(--ui-text-highlighted);
}

.docs-tablist[data-indicator] [aria-selected="true"] {
  border-bottom-color: transparent;
}

.docs-tablist .indicator {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 1px;
  background: var(--ui-text-highlighted);
  pointer-events: none;
  transition:
    transform 200ms cubic-bezier(0.23, 1, 0.32, 1),
    width 200ms cubic-bezier(0.23, 1, 0.32, 1);
}

.docs-tablist .indicator[data-still] {
  transition: none;
}

.docs-examples > .docs-example {
  margin: 0;
}

.docs-examples > .docs-example > .docs-example-bar {
  position: absolute;
  top: 0.3rem;
  right: 0;
  margin: 0;
}

/* Too narrow to share the tab row: the switch gets its own row. */
@media (max-width: 40rem) {
  .docs-tablist {
    margin-right: 0;
  }

  .docs-examples > .docs-example > .docs-example-bar {
    position: static;
    margin-bottom: 0.5rem;
  }
}
</style>
