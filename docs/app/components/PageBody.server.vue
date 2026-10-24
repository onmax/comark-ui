<script setup lang="ts">
// A server component, so the rendered page reaches the browser once: in the HTML on a first load, and as island JSON
// on a client-side navigation. Never in the payload.
const props = defineProps<{ slug: string }>();
const data = await $fetch(`/api/pages/${props.slug || "index"}`);
</script>

<template>
  <div class="app" v-html="data?.body" />
</template>
