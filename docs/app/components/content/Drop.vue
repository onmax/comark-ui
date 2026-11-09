<script setup lang="ts">
// `::drop`: the landing's band for Drop, its pitch beside the list in it, drawn as numbered steps.
</script>

<template>
  <section class="landing-drop">
    <img src="/drop.svg" alt="" width="36" height="36" />
    <slot />
    <div class="landing-drop-actions">
      <UButton
        to="https://drop.vitehub.dev"
        color="neutral"
        size="lg"
        trailing-icon="i-lucide-arrow-up-right"
        label="Try Drop"
      />
      <UButton
        to="/recipes/share"
        color="neutral"
        variant="outline"
        size="lg"
        label="Read the recipe"
      />
    </div>
  </section>
</template>

<style scoped>
/* The pitch runs down the first column in the Markdown's order, and the steps fill the second. */
.landing-drop {
  display: grid;
  grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr);
  grid-auto-flow: dense;
  align-content: center;
  column-gap: 4rem;
  width: var(--column);
  margin: 8rem auto 0;
  padding: 3rem;
  border-radius: var(--r-lg);
  background: var(--soft);
  box-shadow: inset 0 0 0 1px var(--line);
}

.landing-drop > :deep(*) {
  grid-column: 1;
}

.landing-drop > img {
  margin-bottom: 1.25rem;
}

.landing-drop > :deep(p) {
  max-width: 30rem;
  margin: 1rem 0 0;
  color: var(--muted);
  font-size: 1.0625rem;
  line-height: 1.7;
}

.landing-drop > :deep(p a) {
  color: var(--fg);
  font-weight: 500;
}

.landing-drop > :deep(ol) {
  display: flex;
  grid-column: 2;
  grid-row: 1 / span 4;
  align-self: center;
  flex-direction: column;
  gap: 0.75rem;
  margin: 0;
  padding: 0;
  list-style: none;
  counter-reset: step;
}

.landing-drop > :deep(ol li) {
  display: flex;
  align-items: center;
  gap: 0.875rem;
  margin: 0;
  padding: 0.875rem 1rem;
  border-radius: var(--r-md);
  background: var(--bg);
  box-shadow: 0 0 0 1px var(--line);
  color: var(--fg);
  counter-increment: step;
}

.landing-drop > :deep(ol li::before) {
  content: counter(step);
  display: grid;
  flex: none;
  place-items: center;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 50%;
  background: var(--fg);
  color: var(--bg);
  font-size: 0.8125rem;
  font-weight: 600;
}

.landing-drop-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 1.75rem;
}

@media (max-width: 60rem) {
  .landing-drop {
    grid-template-columns: minmax(0, 1fr);
    row-gap: 0;
    margin-top: 5rem;
    padding: 2rem 1.5rem;
  }

  .landing-drop > :deep(ol) {
    grid-column: 1;
    grid-row: auto;
    margin-top: 2rem;
  }
}
</style>
