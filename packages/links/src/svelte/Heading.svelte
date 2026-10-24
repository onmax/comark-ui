<!-- A heading for `@comark/svelte`, with its `#` link beside it when the parse plugin gave it one. Everything but `tag` and `anchor` belongs to the heading itself. -->
<script>
  import { onMount } from "svelte";
  import { addStyles } from "comark-links/client";

  let { tag, anchor = undefined, children, ...attrs } = $props();

  onMount(() => {
    if (anchor) addStyles();
  });
</script>

{#if anchor && attrs.id}
  <div class="cl-heading">
    <svelte:element this={tag} {...attrs}>{@render children?.()}</svelte:element>
    <a class="cl-anchor" href="#{attrs.id}"><span aria-hidden="true">{anchor.icon}</span><span class="cl-sr">{anchor.label}</span></a>
  </div>
{:else}
  <svelte:element this={tag} {...attrs}>{@render children?.()}</svelte:element>
{/if}
