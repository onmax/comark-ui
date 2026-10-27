<!-- Each step of a `::magic-move` for `@comark/svelte`. -->
<script>
  let { index = undefined, count = undefined, label = undefined, children } = $props();
</script>

<div
  class="cmv-step"
  role="group"
  aria-roledescription="step"
  aria-label="{index} of {count}"
  data-inactive={Number(index) > 1 ? "" : undefined}
>
  {#if label}<div class="cmv-label">{label}</div>{/if}
  {@render children?.()}
</div>
