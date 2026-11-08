<!-- A callout for `@comark/svelte`. -->
<script>
  import { onMount } from "svelte";
  import { addStyles, icon, typeOf } from "comark-github/client";

  let { type = undefined, title = undefined, children } = $props();
  const kind = $derived(typeOf(type));
  onMount(addStyles);
</script>

<div class="cgc" data-comark-frame="" data-type={kind}>
  <span class="cgc-icon" aria-hidden="true">{@html icon(kind)}</span>
  <p class="cgc-title">{title}</p>
  <div class="cgc-body">{@render children?.()}</div>
</div>
