<!-- Math for `@comark/svelte`. The typeset MathML arrives as its children. -->
<script>
  import { onMount } from "svelte";
  import { addStyles, classOf } from "comark-mathml/client";

  let { tex = undefined, display = false, typeset = false, children = undefined } = $props();

  // @comark/svelte creates elements with <svelte:element>, which gives MathML's tags the HTML namespace, where they
  // don't lay out as math. A server render is parsed as MathML, so this only happens to a formula made in the browser:
  // its markup is then parsed again into a copy, shown in place of Svelte's own, and kept in step with it.
  const MATHML = "http://www.w3.org/1998/Math/MathML";
  let drawn = $state();
  let copy = $state("");
  onMount(() => {
    addStyles();
    if (!drawn) return;
    const sync = () => {
      const math = drawn.querySelector("math");
      copy = math && math.namespaceURI !== MATHML ? drawn.innerHTML : "";
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(drawn, { subtree: true, childList: true, characterData: true, attributes: true });
    return () => observer.disconnect();
  });
</script>

{#if typeset}<span class={classOf(display, true)}>{#if copy}{@html copy}{/if}<span bind:this={drawn} style:display={copy ? "none" : "contents"}>{@render children?.()}</span></span>{:else}<span class={classOf(display, false)}>{tex ?? ""}</span>{/if}
