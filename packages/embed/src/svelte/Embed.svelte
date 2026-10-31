<!-- `::embed` for `@comark/svelte`. -->
<script>
  import { onMount } from "svelte";
  import { addStyles, allow, icons, referrerPolicy, start } from "comark-embed/client";

  let {
    provider = undefined,
    src = undefined,
    label = undefined,
    size = undefined,
    href = undefined,
    title = undefined,
    host = undefined,
  } = $props();
  onMount(addStyles);
  $effect(() => provider === "x" ? start() : undefined);
</script>

{#if href && src}
  <figure class="ce" data-provider={provider} data-size={size}>
    <div class="ce-frame">
      {#key src}
        <iframe {src} title={label} loading="lazy" {allow} allowfullscreen referrerpolicy={referrerPolicy}></iframe>
      {/key}
    </div>
    <figcaption><a {href}>{title}<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d={icons.external} /></svg></a></figcaption>
  </figure>
{:else if href}
  <a class="ce-card" {href}><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d={icons.globe} /></svg><strong>{title}</strong> <span>{host}</span></a>
{/if}
