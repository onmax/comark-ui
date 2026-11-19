<script>
  let { step, tag = "div", ...attrs } = $props();
</script>

<svelte:element this={tag} class="cht-line" {...attrs}>
  <span class="cht-dot" aria-hidden="true"></span>
  <span class="cht-title">{step.title}</span>
  {#if step.kind === "tool" && step.state}<span class="cht-state">{step.state}</span>{/if}
  {#if tag === "summary"}<span class="cht-chevron" aria-hidden="true" data-motion-chevron=""></span>{/if}
</svelte:element>
