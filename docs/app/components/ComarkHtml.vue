<script setup lang="ts">
// A block that has only an HTML renderer (annotate, diff, quiz, comments), drawn on the server by docs/markdown.ts.
defineProps<{ html: string }>();
</script>

<template>
  <div class="comark-html" v-html="html" />
</template>
