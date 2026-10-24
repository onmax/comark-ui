<!-- Each step of a `::steps` for `@comark/svelte`. -->
<script>
  let { children } = $props();
</script>

<li class="cs-step">{@render children?.()}</li>
