<!-- The notes under an annotated fence, for `@comark/svelte`. -->
<script>
  import { onMount } from "svelte";
  import { addStyles } from "comark-code-notes/client";

  let { start = undefined, children } = $props();
  onMount(addStyles);
</script>

<ol class="cn-notes" start={start && start !== 1 ? start : undefined}>{@render children?.()}</ol>
