<!-- A highlight or superscript for `@comark/svelte`, rendered as it would be without the components, with the class beside any the Markdown gave it. -->
<script>
  import { onMount } from "svelte";
  import { addStyles } from "comark-mark/client";

  let { tag, name, class: className = undefined, children, ...attrs } = $props();

  onMount(addStyles);
</script>

<svelte:element this={tag} {...attrs} class={className ? `${name} ${className}` : name}>{@render children?.()}</svelte:element>
