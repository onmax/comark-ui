<!-- A chart for `@comark/svelte`. Its marks are drawn only by `@comark/html`. -->
<script>
  import { onMount } from "svelte";
  import { addStyles } from "comark-charts/client";

  let { type = undefined, title = undefined, svg = undefined, children } = $props();
  onMount(addStyles);
</script>

{#if svg}
  <figure class="cch" data-type={type}>
    {#if title}<figcaption>{title}</figcaption>{/if}
    <div class="cch-plot">{@html svg}</div>
    <details class="cch-data"><summary>Data</summary>{@render children?.()}</details>
  </figure>
{:else}
  <div>{@render children?.()}</div>
{/if}
