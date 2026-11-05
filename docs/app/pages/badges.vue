<script setup lang="ts">
// The badge builder: docs/badges/index.html's form with each badge logo drawn in, and docs/badges/main.ts running it.
import "~/assets/tools.css";
import "~~/badges/style.css";
import markup from "~~/badges/index.html?raw";
import { badgeIcon, icons } from "../../../packages/badge/src/svg.ts";

useDocsSeo({
  title: "Badge builder",
  description: "Create and share SVG badges for your project.",
});

const builder = markup.replace(/<span data-logo="([^"]+)"><\/span>/g, (_, name: string) => {
  const icon = icons.find((icon) => icon === name);
  return icon ? badgeIcon(icon) : "";
});

const root = ref<HTMLElement>();
let stop: (() => void) | undefined;
let gone = false;
onMounted(async () => {
  const { startBadgeBuilder } = await import("~~/badges/main.ts");
  const form = root.value?.querySelector<HTMLElement>("[data-badge-builder]");
  if (!gone && form) stop = startBadgeBuilder(form);
});
onBeforeUnmount(() => {
  gone = true;
  stop?.();
});
</script>

<template>
  <div ref="root" class="tool badges-page">
    <div class="hero">
      <h1>Badge builder</h1>
      <p>Create a badge, then copy it into your README or Comark document.</p>
    </div>
    <div v-html="builder" />
    <p class="badges-docs">
      <NuxtLink to="/badge">Badge syntax and hosting options</NuxtLink>
    </p>
  </div>
</template>

<style>
.badges-page {
  max-width: 62rem;
  margin: 0 auto;
  padding: 2.5rem 2rem 4rem;
}

/* The builder focuses the heading after a client-side navigation, for screen readers; it isn't a control. */
.badges-page h1:focus {
  outline: none;
}

.badges-docs a {
  color: var(--fg);
  text-decoration: underline;
  text-underline-offset: 0.2em;
}
</style>
