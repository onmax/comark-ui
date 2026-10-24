<!-- `::details`, each `:::accordion-item`, and `::collapsible` for `@comark/svelte`. -->
<script>
  import { onMount } from "svelte";
  import { addStyles } from "comark-details/client";

  let { variant = undefined, name = undefined, open = undefined, children } = $props();
  onMount(addStyles);
</script>

<details class="cdt" data-variant={variant} name={name || undefined} open={Boolean(open)}>{@render children?.()}</details>
