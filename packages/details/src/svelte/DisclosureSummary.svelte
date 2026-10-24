<!-- The summary of a disclosure for `@comark/svelte`. -->
<script>
  import { Icon } from "comark-icon/svelte";

  let { icon = undefined, show = undefined, hide = undefined, children } = $props();
</script>

<summary class="cdt-summary">{#if icon?.src}<Icon {...icon} />{/if}<span>{#if show}<span class="cdt-toggle" data-show="{show} " data-hide="{hide} "></span>{/if}{@render children?.()}</span></summary>
