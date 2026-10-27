<!-- Each step of a `::magic-move` for `@comark/svelte`. -->
<script>
  let { uid = "", index = undefined, label = undefined, children } = $props();
</script>

<div
  class="cmv-step"
  role="tabpanel"
  id="{uid}-panel-{index}"
  aria-labelledby="{uid}-tab-{index}"
  tabindex="0"
  data-inactive={Number(index) > 1 ? "" : undefined}
>
  <div class="cmv-caption">{label}</div>
  {@render children?.()}
</div>
