<!-- The properties box for `@comark/svelte`. -->
<script>
  import { onMount } from "svelte";
  import { addStyles } from "comark-properties/client";

  let { children } = $props();
  onMount(addStyles);
</script>

{#if children}<dl class="cfm">{@render children()}</dl>{/if}
