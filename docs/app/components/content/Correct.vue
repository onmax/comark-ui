<script setup lang="ts">
// `::correct` on a Doctor rule page: Markdown with the problem fixed, shown like an example.
import Example from "./Example.vue";
</script>

<template>
  <p class="docs-verdict mt-4 text-sm font-medium">Correct</p>
  <Example><slot /></Example>
</template>
