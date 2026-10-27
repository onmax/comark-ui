<!-- `::magic-move` for `@comark/svelte`. -->
<script>
  import { onMount } from "svelte";
  import { css, start } from "comark-magic-move/client";

  let { count = 0, title = undefined, children } = $props();
  const total = $derived(Number(count) || 0);

  onMount(() => start(css));
</script>

<div class="cmv" role="region" aria-roledescription="code steps" aria-label={title ?? "Code steps"}>
  <div class="cmv-stage">{@render children?.()}</div>
  {#if total > 1}
    <div class="cmv-controls">
      <span class="cmv-count" aria-live="polite">1 / {total}</span>
      <div class="cmv-steps">
        <button type="button" class="cmv-button" data-magic-move-step="-1" aria-label="Previous step" aria-disabled="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
        </button>
        <button type="button" class="cmv-button" data-magic-move-step="1" aria-label="Next step">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
        </button>
      </div>
    </div>
  {/if}
</div>
