<!-- The properties box for `@comark/svelte`. -->
<script>
  import { onMount } from "svelte";
  import { addStyles, localizeDates } from "comark-properties/client";

  let { children } = $props();
  let box = $state();
  onMount(addStyles);
  $effect(() => {
    const root = box;
    if (!root) return;
    // A snippet can update its rows without changing its identity or the box binding.
    const options = {
      subtree: true,
      childList: true,
      characterData: true,
      attributeFilter: ["datetime", "lang"],
    };
    const observer = new MutationObserver(() => {
      observer.disconnect();
      localizeDates(root);
      observer.observe(root, options);
    });
    localizeDates(root);
    observer.observe(root, options);
    return () => observer.disconnect();
  });
</script>

{#if children}<dl class="cfm" bind:this={box}>{@render children()}</dl>{/if}
