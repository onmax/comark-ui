<!-- `::bundle` for `@comark/svelte`. -->
<script>
  import { onMount } from "svelte";
  import { addStyles } from "comark-bundle/client";

  let { label = undefined, children } = $props();
  onMount(addStyles);
</script>

<figure class="cbr" data-comark-frame data-not-typeset aria-label={label || undefined}>{@render children?.()}</figure>
