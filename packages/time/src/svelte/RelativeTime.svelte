<!-- `:time` for `@comark/svelte`. -->
<script>
  import { onMount } from "svelte";
  import { css, start } from "comark-time/client";

  let { id = undefined, datetime = undefined, mode = undefined, label = undefined, tip = undefined, locale = undefined, threshold = undefined } = $props();
  onMount(() => start(css));
</script>

{#if datetime && label}
  <time class="ctm" lang={locale} data-threshold={threshold} {datetime} data-mode={mode} tabindex="0" aria-describedby={id}>{label}<span class="ctm-tip" role="tooltip" {id}><span class="ctm-pill">{tip}</span></span></time>
{/if}
