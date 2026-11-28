<!-- `::post` for `@comark/svelte`. -->
<script>
  import { onMount } from "svelte";
  import { addStyles } from "comark-social/client";

  let { platform = "generic", label = undefined, quote = undefined, children } = $props();
  onMount(addStyles);
  const outer = $derived(quote === undefined);
</script>

<article
  class="csl"
  data-platform={platform || "generic"}
  data-quote={outer ? undefined : ""}
  data-comark-frame={outer ? "" : undefined}
  data-not-typeset={outer ? "" : undefined}
  aria-label={label || undefined}
>{@render children?.()}</article>
