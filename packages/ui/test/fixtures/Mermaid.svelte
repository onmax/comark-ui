<script lang="ts">
  import { createPeleComponent } from "comark-pele/svelte";
  import { addMermaidStyles, typesetCss } from "../../src/client.ts";

  const Pele = createPeleComponent({ onRender: addMermaidStyles });
  let { initial }: { initial: string } = $props();
  let content = $state(initial);
  export function update(next: string) { content = next; }
</script>

{@html `<style>${typesetCss}</style>`}
<Pele {content} />
