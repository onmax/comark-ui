<script setup lang="ts">
// Replaces the shell's DocsMarkdown to add the comark-ui components. The shell passes its own (`pre`) on top.
import { MarkdownDocument } from "@comark/vue";
import contentComponents from "#docs/components";
import { components as carousel } from "comark-carousel/vue";
import { components as charts } from "comark-charts/vue";
import { components as github } from "comark-github/vue";
import { components as tabs } from "comark-tabs/vue";
import { components as zoom } from "comark-zoom/vue";

import type { Component } from "vue";
import type { DocsDocument } from "@vite-hub/docs";

const props = defineProps<{ document: DocsDocument; components?: Record<string, Component> }>();

const comarkUi: Record<string, Component> = { ...carousel, ...charts, ...github, ...tabs, ...zoom };
const componentsManifest = (tag: string) => contentComponents[tag]?.();
</script>

<template>
  <MarkdownDocument
    :value="{ nodes: props.document.nodes, frontmatter: {}, meta: {} }"
    :components="{ ...comarkUi, ...props.components }"
    :components-manifest="componentsManifest"
  />
</template>
