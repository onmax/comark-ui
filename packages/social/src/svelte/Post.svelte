<!-- `::post` for `@comark/svelte`. -->
<script>
  import { onMount } from "svelte";
  import { addStyles } from "comark-social/client";

  let {
    platform = "generic",
    label = undefined,
    quote = undefined,
    thread = undefined,
    focal = undefined,
    rail = undefined,
    children,
  } = $props();
  onMount(addStyles);
  const outer = $derived(quote === undefined && thread === undefined);
  const flag = (value) => (value === undefined ? undefined : "");
</script>

<article
  class="csl"
  data-platform={platform || "generic"}
  data-quote={flag(quote)}
  data-thread={flag(thread)}
  data-focal={flag(focal)}
  data-rail={flag(rail)}
  data-comark-frame={outer ? "" : undefined}
  data-not-typeset={outer ? "" : undefined}
  aria-label={label || undefined}
>{@render children?.()}</article>
