<!-- `::file-tree` for `@comark/svelte`. -->
<script>
  import { onMount } from "svelte";
  import { addStyles } from "comark-file-tree/client";

  let { children } = $props();
  onMount(addStyles);
</script>

<div class="cft"><ul>{@render children?.()}</ul></div>
