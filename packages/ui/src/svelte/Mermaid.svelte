<!-- Pele's card in `.cmm` with the bar of buttons, as `comark-ui/html` draws it. In the browser Pele's own `mount()`
     zooms the diagram in place, so it doesn't zoom with comark-zoom. -->
<script>
  import { onMount } from "svelte";
  import { Pele } from "comark-pele/svelte";
  import { mermaidBar, startMermaid } from "comark-ui/client";

  let { content = "", ...rest } = $props();
  onMount(() => startMermaid());
</script>

<div class="cmm" data-source={content}>
  <Pele {content} {...rest} />
  <div class="cmm-bar">{@html mermaidBar()}</div>
</div>
