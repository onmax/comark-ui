<script setup lang="ts">
import { onMounted, ref, watch } from "vue";

// A block that has only an HTML renderer (annotate, diff, quiz, comments), drawn on the server by docs/markdown.ts.
// `block` is its tag, so a page's styles can tell a diff from a screenshot without looking inside.
const props = defineProps<{ html: string; block?: string }>();
const root = ref<HTMLElement>();

// Scripts inserted by v-html are inert. Recreate them after mounting or replacing the HTML; the package runtimes
// guard repeated starts, including when the server's scripts already ran before hydration.
function runScripts() {
  for (const old of root.value?.querySelectorAll("script") ?? []) {
    const script = document.createElement("script");
    for (const { name, value } of old.attributes) script.setAttribute(name, value);
    script.textContent = old.textContent;
    old.replaceWith(script);
  }
}
onMounted(runScripts);
watch(() => props.html, runScripts, { flush: "post" });
</script>

<template>
  <div ref="root" class="comark-html" :data-block="block" v-html="html" />
</template>
