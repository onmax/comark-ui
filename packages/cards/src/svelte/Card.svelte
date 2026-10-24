<!-- `::card` for `@comark/svelte`. -->
<script>
  import { onMount } from "svelte";
  import { addStyles, external as arrow, isExternalHref, isSafeHref, rel } from "comark-cards/client";
  import { Icon } from "comark-icon/svelte";

  let {
    color = "primary",
    variant = undefined,
    to = undefined,
    target = undefined,
    external = undefined,
    label = undefined,
    icon = undefined,
    children,
  } = $props();
  onMount(addStyles);
  const href = $derived(isSafeHref(to) ? to : undefined);
  const linkTarget = $derived(target || (isExternalHref(href) ? "_blank" : undefined));
</script>

<div class="ccr" data-color={color} data-variant={variant}>{#if href}<a class="ccr-link" href={href} target={linkTarget} rel={rel(linkTarget)} aria-label={label}></a>{/if}{#if icon?.src}<Icon {...icon} />{/if}{#if external}<svg class="ccr-external" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d={arrow} /></svg>{/if}{@render children?.()}</div>
