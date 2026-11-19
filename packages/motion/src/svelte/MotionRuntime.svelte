<!-- Starts the motion layer while a document is on the page. The plugin adds it to every document. -->
<script>
  import { onMount } from "svelte";
  import { start } from "comark-motion/client";

  onMount(() => start());
</script>
