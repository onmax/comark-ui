<!-- Adds the styles for the new-tab warning, and renders nothing. -->
<script>
  import { onMount } from "svelte";
  import { addStyles } from "comark-links/client";

  onMount(addStyles);
</script>
