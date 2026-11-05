<script setup lang="ts">
// Replaces the shell's DocsMarkdown to add comark-ui's components. The shell passes its own (`pre`) on top.
import { MarkdownDocument } from "@comark/vue";
import contentComponents from "#docs/components";
import { components } from "comark-ui/vue";
import ComarkHtml from "./ComarkHtml.vue";

import type { Component } from "vue";
import type { DocsDocument } from "@vite-hub/docs";

const props = defineProps<{ document: DocsDocument; components?: Record<string, Component> }>();

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
/* comark-code supplies the controls; the page supplies the code block's layout. */
.comark-content .ck > pre {
  overflow-x: auto;
}
</style>
