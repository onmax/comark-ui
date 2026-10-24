<!-- `::field` for `@comark/svelte`. -->
<script>
  import { onMount } from "svelte";
  import { addStyles } from "comark-fields/client";

  let {
    name = undefined,
    type = undefined,
    required = undefined,
    default: fallback = undefined,
    children,
  } = $props();
  onMount(addStyles);
</script>

<div class="cfl"><div class="cfl-head">{#if name}<code class="cfl-name">{name}</code>{/if}{#if type}<span class="cfl-type">{type}</span>{/if}{#if required}<span class="cfl-required">required</span>{/if}{#if fallback}<span class="cfl-default">Default: <code>{fallback}</code></span>{/if}</div><div class="cfl-body">{@render children?.()}</div></div>
