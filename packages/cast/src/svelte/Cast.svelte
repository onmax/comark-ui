<!-- `::cast` for `@comark/svelte`. -->
<script>
  import { onMount } from "svelte";
  import { addStyles } from "comark-cast/client";

  let { mode = undefined, title = undefined, children } = $props();
  onMount(addStyles);
</script>

{#if mode}
  <figure class="cca" data-mode={mode}>
    {#if title}<figcaption>{title}</figcaption>{/if}
    <pre class="cca-term">{@render children?.()}</pre>
  </figure>
{/if}
