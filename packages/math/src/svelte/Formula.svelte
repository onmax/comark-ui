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
  onMount(addStyles);
  // The span that holds Svelte's own render appears whenever the formula is typeset, on mount or on a later update.
  $effect(() => {
    const box = drawn;
    if (!box) {
      copy = "";
      return;
    }
    const sync = () => {
      const math = box.querySelector("math");
      copy = math && math.namespaceURI !== MATHML ? box.innerHTML : "";
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(box, { subtree: true, childList: true, characterData: true, attributes: true });
    return () => observer.disconnect();
  });
</script>

{#if typeset}<span class={classOf(display, true)}>{#if copy}{@html copy}{/if}<span bind:this={drawn} style:display={copy ? "none" : "contents"}>{@render children?.()}</span></span>{:else}<span class={classOf(display, false)}>{tex ?? ""}</span>{/if}
