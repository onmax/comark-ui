<script>
  import Embed from "../../src/svelte/Embed.svelte";

  let { initial } = $props();
  let attrs = $state(initial);
  export function update(next) {
    attrs = next;
  }
</script>

<Embed {...attrs} />
