<!-- The side outline for `@comark/svelte`. It starts the script that places it when it mounts. -->
<script>
  import { onMount } from "svelte";
  import { addStyles, start } from "comark-outline/client";

  let { title, children } = $props();
  onMount(() => {
    addStyles();
    return start();
  });
</script>

<nav class="cto cto-rail" aria-label={title}>
  <p class="cto-title">{title}</p>
  {@render children?.()}
</nav>
