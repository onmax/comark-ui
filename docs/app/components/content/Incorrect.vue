<script setup lang="ts">
// `::incorrect` on a Doctor rule page: Markdown that the rule reports, shown like an example.
import Example from "./Example.vue";
</script>

<template>
  <p class="docs-verdict mt-4 text-sm font-medium">Incorrect</p>
  <Example><slot /></Example>
</template>
