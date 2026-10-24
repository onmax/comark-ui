<!-- `::accordion` for `@comark/svelte`. -->
<script>
  import { onMount } from "svelte";
  import { addStyles } from "comark-details/client";

  let { children } = $props();
  onMount(addStyles);
</script>

<div class="cdt-accordion">{@render children?.()}</div>
