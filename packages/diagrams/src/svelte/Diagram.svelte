<!-- Diagrams for `@comark/svelte`. -->
<script>
  import { onMount } from "svelte";
  import { addStyles } from "comark-diagrams/client";

  let { type = undefined, svg = undefined, label = undefined } = $props();
  onMount(addStyles);
</script>

{#if svg}
  <figure class="cdg" data-type={type}>
    <!-- The plugin sanitized the SVG when it drew it. -->
    <div class="cdg-svg" role={label ? "img" : undefined} aria-label={label || undefined}>{@html svg}</div>
    {#if label}<figcaption>{label}</figcaption>{/if}
  </figure>
{/if}
