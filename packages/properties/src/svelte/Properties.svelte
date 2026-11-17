<!-- The properties box for `@comark/svelte`. -->
<script>
  import { relativize, start } from "comark-properties/client";

  let { children } = $props();
  let box = $state();
  $effect(() => {
    const root = box;
    if (!root) return;
    const stop = start(root);
    // A snippet can update its rows without changing its identity or the box binding.
    const options = {
      subtree: true,
      childList: true,
      characterData: true,
      attributeFilter: ["datetime", "lang"],
    };
    const observer = new MutationObserver(() => {
      observer.disconnect();
      relativize(root)();
      observer.observe(root, options);
    });
    observer.observe(root, options);
    return () => {
      observer.disconnect();
      stop();
    };
  });
</script>

{#if children}<dl class="cfm" data-comark-frame="" bind:this={box}>{@render children()}</dl>{/if}
