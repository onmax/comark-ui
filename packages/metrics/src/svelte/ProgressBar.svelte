<!-- `:progress` for `@comark/svelte`. -->
<script>
  import { onMount } from "svelte";
  import { addStyles } from "comark-metrics/client";

  let { value = undefined, max = undefined, percent = undefined, label = undefined } = $props();
  onMount(addStyles);
</script>

{#if percent}
  <span class="cmt-progress">{#if label}<span class="cmt-label">{label}</span>{/if}<progress {value} {max} aria-label={label || undefined}>{percent}</progress><span class="cmt-percent">{percent}</span></span>
{/if}
