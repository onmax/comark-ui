<!-- Math for `@comark/svelte`. The typeset MathML arrives as its children. -->
<script>
  import { onMount } from "svelte";
  import { addStyles, classOf } from "comark-mathml/client";

  let { tex = undefined, display = false, children = undefined } = $props();
  onMount(addStyles);
</script>

{#if children}<span class={classOf(display, true)}>{@render children()}</span>{:else}<span class={classOf(display, false)}>{tex ?? ""}</span>{/if}
