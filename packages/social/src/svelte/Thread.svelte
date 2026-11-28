<!-- `::thread` for `@comark/svelte`. -->
<script>
  import { onMount } from "svelte";
  import { addStyles } from "comark-social/client";

  let { platform = "generic", label = undefined, children } = $props();
  onMount(addStyles);
</script>

<div
  class="csl-thread"
  role="group"
  data-platform={platform || "generic"}
  data-comark-frame=""
  data-not-typeset=""
  aria-label={label || undefined}
>{@render children?.()}</div>
