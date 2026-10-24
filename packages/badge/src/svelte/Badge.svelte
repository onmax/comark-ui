<!-- `:badge` for `@comark/svelte`. -->
<script>
  import { onMount } from "svelte";
  import { addStyles } from "comark-badge/client";

  let { color = "primary", children } = $props();
  onMount(addStyles);
</script>

<span class="cb" data-color={color}>{@render children?.()}</span>
