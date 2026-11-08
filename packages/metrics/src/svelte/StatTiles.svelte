<!-- `::stats{tiles}` for `@comark/svelte`. -->
<script>
  import { onMount } from "svelte";
  import { addStyles } from "comark-metrics/client";

  let { children } = $props();
  onMount(addStyles);
</script>

<dl class="cmt-tiles" data-comark-frame="">{@render children?.()}</dl>
