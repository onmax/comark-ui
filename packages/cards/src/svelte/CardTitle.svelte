<!-- A card's title for `@comark/svelte`. -->
<script>
  let { children } = $props();
</script>

<p class="ccr-title">{@render children?.()}</p>
