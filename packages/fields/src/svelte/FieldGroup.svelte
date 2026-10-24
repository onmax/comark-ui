<!-- `::field-group` for `@comark/svelte`. -->
<script>
  import { onMount } from "svelte";
  import { addStyles } from "comark-fields/client";

  let { children } = $props();
  onMount(addStyles);
</script>

<div class="cfl-group">{@render children?.()}</div>
