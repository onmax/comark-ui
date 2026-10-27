<script lang="ts">
  import { typesetCss } from "../../src/client.ts";
  import Mermaid from "../../src/svelte/Mermaid.svelte";

  let { initial }: { initial: string } = $props();
  let content = $state(initial);
  export function update(next: string) { content = next; }
</script>

{@html `<style>${typesetCss}</style>`}
<Mermaid {content} />
