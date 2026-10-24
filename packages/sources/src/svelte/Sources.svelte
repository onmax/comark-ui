<!-- `::sources` for `@comark/svelte`. -->
<script>
  import { onMount } from "svelte";
  import { addStyles } from "comark-sources/client";

  let { title = undefined, children } = $props();
  onMount(addStyles);
</script>

{#if children}
  <section class="cso" aria-label={title || "Sources"}>
    <p class="cso-title">{title || "Sources"}</p>
    {@render children()}
  </section>
{/if}
