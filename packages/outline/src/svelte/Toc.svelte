<!-- `::toc` for `@comark/svelte`. -->
<script>
  import { onMount } from "svelte";
  import { addStyles } from "comark-outline/client";

  let { title = undefined, empty = false, children } = $props();
  onMount(addStyles);
</script>

{#if !empty && children}
  <nav class="cto" aria-label={title || "Contents"}>
    {#if title}<p class="cto-title">{title}</p>{/if}
    {@render children()}
  </nav>
{/if}
