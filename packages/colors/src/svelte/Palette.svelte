<!-- `::palette` for `@comark/svelte`. -->
<script>
  import { onMount } from "svelte";
  import { addStyles } from "comark-colors/client";

  let { children } = $props();
  onMount(addStyles);
</script>

<ul class="cco-palette">{@render children?.()}</ul>
