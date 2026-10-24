<!-- `::columns` for `@comark/svelte`. -->
<script>
  import { onMount } from "svelte";
  import { addStyles } from "comark-cards/client";

  let { cols = "2", children } = $props();
  onMount(addStyles);
</script>

<div class="ccr-columns" data-cols={String(cols)}>{@render children?.()}</div>
