<!-- `:badge` for `@comark/svelte`. -->
<script>
  import { onMount } from "svelte";
  import { addStyles } from "comark-badge/client";

  let { color = "primary", src, label, children } = $props();
  onMount(addStyles);
</script>

{#if src}
  <img class="cb-image" {src} alt={label ?? "Badge"} height="26" />
{:else}
  <span class="cb" data-color={color}>{@render children?.()}</span>
{/if}
