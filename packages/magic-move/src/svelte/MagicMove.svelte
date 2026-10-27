<!-- `::magic-move` for `@comark/svelte`. -->
<script>
  import { onMount } from "svelte";
  import { css, start } from "comark-magic-move/client";

  let { uid = "", labels = [], title = undefined, children } = $props();

  onMount(() => start(css));
</script>

<div class="cmv">
  <div class="cmv-list" role="tablist" aria-label={title || undefined}>
    {#each labels as label, at}
      <button
        type="button"
        class="cmv-tab"
        role="tab"
        id="{uid}-tab-{at + 1}"
        aria-controls="{uid}-panel-{at + 1}"
        aria-selected={String(at === 0)}
        tabindex={at === 0 ? 0 : -1}>{label}</button
      >
    {/each}
  </div>
  <div class="cmv-stage">{@render children?.()}</div>
</div>
