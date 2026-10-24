<!-- `:delta`, and each change in a `::stats` table, for `@comark/svelte`. -->
<script>
  import { onMount } from "svelte";
  import { addStyles } from "comark-metrics/client";

  let { from = undefined, to = undefined, change = undefined, direction = undefined, verdict = undefined } = $props();
  onMount(addStyles);
</script>

{#if change}
  <span class="cmt-delta" data-direction={direction} data-verdict={verdict}>{#if from && to}<span class="cmt-from">{from}</span> → <span class="cmt-to">{to}</span> {/if}<span class="cmt-change">{change}</span></span>
{/if}
