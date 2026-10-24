<!-- `::card-group` for `@comark/svelte`. -->
<script>
  import { onMount } from "svelte";
  import { addStyles } from "comark-cards/client";

  let { children } = $props();
  onMount(addStyles);
</script>

<div class="ccr-group">{@render children?.()}</div>
