<!-- `:qr` for `@comark/svelte`. -->
<script>
  import { onMount } from "svelte";
  import { addStyles, viewBox } from "comark-qr/client";

  let { value = undefined, size = undefined, path = undefined } = $props();
  onMount(addStyles);
</script>

{#if path}<span class="cqr" role="img" aria-label="QR code: {value ?? ''}"><svg viewBox={viewBox(Number(size))} width="128" height="128" aria-hidden="true"><path d={path} fill="currentColor" /></svg></span>{/if}
