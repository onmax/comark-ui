<!-- Tables for `@comark/svelte`. -->
<script>
  import { onMount } from "svelte";
  import { bar, css, start } from "comark-table/client";

  let { copy = false, sort = false, children } = $props();
  onMount(() => start(css));
</script>

<div class="ctb">
  {#if copy}
    <!-- Static markup, the same string every renderer uses. -->
    <div class="ctb-bar">{@html bar()}</div>
  {/if}
  <div class="ctb-scroll">{@render children?.()}</div>
</div>
