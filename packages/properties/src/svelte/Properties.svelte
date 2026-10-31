<!-- The properties box for `@comark/svelte`. -->
<script>
  import { onMount } from "svelte";
  import { addStyles, localizeDates } from "comark-properties/client";

  let { children } = $props();
  let box = $state();
  onMount(addStyles);
  $effect(() => {
    if (box) localizeDates(box);
  });
</script>

{#if children}<dl class="cfm" bind:this={box}>{@render children()}</dl>{/if}
