<!-- Each step of a `::magic-move` for `@comark/svelte`. -->
<script>
  import { getContext } from "svelte";

  let { uid = "", index = undefined, label = undefined, children } = $props();
  const parentId = getContext("comark-magic-move");
  const id = $derived(parentId?.() || uid);
</script>

<div
  class="cmv-step"
  role="tabpanel"
  id="{id}-panel-{index}"
  aria-labelledby="{id}-tab-{index}"
  tabindex="0"
  data-inactive={Number(index) > 1 ? "" : undefined}
>
  <div class="cmv-caption">{label}</div>
  {@render children?.()}
</div>
