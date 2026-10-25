<!-- Math for `@comark/svelte`. -->
<script>
  import { onMount } from "svelte";
  import { addStyles, classOf } from "comark-math/client";

  let { tex = undefined, display = false, html = undefined } = $props();
  onMount(addStyles);
</script>

<!-- The plugin typeset `html` itself, with links and other trusted commands off. -->
{#if html}<span class={classOf(display, true)}>{@html html}</span>{:else}<span class={classOf(display, false)}>{tex ?? ""}</span>{/if}
