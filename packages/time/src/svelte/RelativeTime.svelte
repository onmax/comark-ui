<!-- `:time` for `@comark/svelte`. -->
<script>
  import { onMount } from "svelte";
  import { addStyles } from "comark-time/client";

  let { id = undefined, datetime = undefined, mode = undefined, label = undefined, tip = undefined } = $props();
  onMount(addStyles);
</script>

{#if datetime && label}
  <time class="ctm" {datetime} data-mode={mode} tabindex="0" aria-describedby={id}>{label}<span class="ctm-tip" role="tooltip" {id}><span class="ctm-pill">{tip}</span></span></time>
{/if}
