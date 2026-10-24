<!-- `::steps` for `@comark/svelte`. -->
<script>
  import { onMount } from "svelte";
  import { addStyles, counterReset } from "comark-steps/client";

  let { start = undefined, children } = $props();
  const reset = $derived(counterReset(start));
  onMount(addStyles);
</script>

<ol class="cs" start={reset ? start : undefined} style:counter-reset={reset}>{@render children?.()}</ol>
