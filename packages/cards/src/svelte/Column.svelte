<!-- Each cell of a `::columns` for `@comark/svelte`. -->
<script>
  let { children } = $props();
</script>

<div class="ccr-column">{@render children?.()}</div>
