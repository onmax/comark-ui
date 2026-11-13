<!-- `::git-graph` for `@comark/svelte`. -->
<script>
  import { onMount } from "svelte";
  import { addStyles } from "comark-git-graph/client";

  let { label = undefined, children } = $props();
  onMount(addStyles);
</script>

<figure class="cgg" data-comark-frame data-not-typeset aria-label={label || undefined}>{@render children?.()}</figure>
