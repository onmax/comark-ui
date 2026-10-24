<script>
  import Heading from "./Heading.svelte";

  let props = $props();
</script>

<Heading tag="h1" {...props} />
