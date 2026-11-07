<script setup lang="ts">
// Replaces the shell's DocsMarkdown to add comark-ui's components. The shell passes its own (`pre`) on top.
import { MarkdownDocument } from "@comark/vue";
import contentComponents from "#docs/components";
import comarkUi from "comark-ui/vue";
import ComarkHtml from "./ComarkHtml.vue";

import type { Component } from "vue";
import type { DocsDocument } from "@vite-hub/docs";

const props = defineProps<{ document: DocsDocument; components?: Record<string, Component> }>();

const { components } = comarkUi();
const comarkUiComponents: Record<string, Component> = { ...components, "comark-html": ComarkHtml };
const componentsManifest = (tag: string) => contentComponents[tag]?.();
</script>

<template>
  <MarkdownDocument
    :value="{ nodes: props.document.nodes, frontmatter: {}, meta: {} }"
    :components="{ ...comarkUiComponents, ...props.components }"
    :components-manifest="componentsManifest"
  />
</template>

<style>
/* comark-code supplies the controls and the room for them at the top; the page supplies the code block's frame, as on
   the old site: outlined in light mode, a flat panel in dark mode. Shiki writes its theme's background inline, which
   only !important beats. */
.comark-content .ck {
  margin-block: 1.25rem;
}
.comark-content .ck > pre {
  margin: 0;
  padding-inline: 0.9rem;
  padding-bottom: 0.8rem;
  overflow-x: auto;
  border-radius: 10px;
  background: var(--ui-bg-elevated) !important;
  box-shadow: inset 0 0 0 1px var(--ui-border);
}
.dark .comark-content .ck > pre {
  box-shadow: none;
}

/* comark-links draws the page's headings, so Nuxt UI's ProseH2 never styles them. These are its sizes and spacing.
   The `.cl-heading` row takes the margins, since a flex row's margins don't collapse into its heading's. */
.docs-content > .comark-content > :is(h2, h3, h4),
.docs-content > .comark-content > .cl-heading > :is(h2, h3, h4) {
  color: var(--ui-text-highlighted);
  font-weight: 700;
}
.docs-content > .comark-content > .cl-heading > :is(h2, h3, h4) {
  margin: 0;
}
.docs-content > .comark-content > :is(h2, .cl-heading:has(> h2)) {
  margin: 3rem 0 1.5rem;
  font-size: 1.5rem;
  line-height: 2rem;
}
.docs-content > .comark-content > :is(h3, .cl-heading:has(> h3)) {
  margin: 2rem 0 0.75rem;
  font-size: 1.25rem;
  line-height: 1.75rem;
}
.docs-content > .comark-content > :is(h4, .cl-heading:has(> h4)) {
  margin: 1.5rem 0 0.5rem;
  font-size: 1.125rem;
  line-height: 1.75rem;
}
</style>
