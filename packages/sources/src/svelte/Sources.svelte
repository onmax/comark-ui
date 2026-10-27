<!-- `::sources` for `@comark/svelte`. -->
<script>
  import { onMount } from "svelte";
  import { css, start } from "comark-sources/client";

  let { title = undefined, children } = $props();
  onMount(() => start(css));
</script>

{#if children}
  <section class="cso" aria-label={title || "Sources"}>
    <p class="cso-title">{title || "Sources"}</p>
    {@render children()}
  </section>
{/if}
