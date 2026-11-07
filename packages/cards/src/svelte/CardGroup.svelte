<!-- `::card-group` for `@comark/svelte`. -->
<script>
  import { onMount } from "svelte";
  import { addStyles } from "comark-cards/client";

  let { children } = $props();
  onMount(addStyles);
</script>

<div class="ccr-group" data-comark-frame="">{@render children?.()}</div>
