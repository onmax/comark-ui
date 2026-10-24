<!-- Code blocks for `@comark/svelte`. Everything the parse plugin didn't write for the wrapper belongs to the `pre`. -->
<script>
  import { onMount } from "svelte";
  import { css, parts, start } from "comark-code/client";

  let { children, ...attrs } = $props();
  const block = $derived(parts(attrs));

  onMount(() => start(css));
</script>

<div {...block.wrapper}>
  <pre {...block.pre}>{@render children?.()}</pre>
  <!-- Static markup built from escaped text, the same string every renderer uses. -->
  <div class="ck-bar">{@html block.bar}</div>
</div>
