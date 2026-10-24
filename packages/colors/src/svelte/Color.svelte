<!-- A color in inline code, or a line of a `::palette`, for `@comark/svelte`. -->
<script>
  import { onMount } from "svelte";
  import { addStyles } from "comark-colors/client";

  let { value = undefined, name = undefined } = $props();
  onMount(addStyles);
</script>

{#if value && name}
  <li><span class="cco-tile" style:--cco={value}></span><span class="cco-name">{name}</span><span class="cco-value">{value}</span></li>
{:else if value}
  <code class="cco"><span class="cco-swatch" style:--cco={value} aria-hidden="true"></span>{value}</code>
{/if}
