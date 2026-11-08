<!-- `::tabs` and `::code-group` for `@comark/svelte`. -->
<script>
  import { onMount, setContext } from "svelte";
  import { css, start } from "comark-tabs/client";
  import { Icon } from "comark-icon/svelte";

  let { labels = [], icons = [], sync = undefined, code = undefined, magic = undefined, children } = $props();
  const mode = $derived(magic === true ? "always" : magic === false ? "never" : magic);
  const id = $props.id();
  setContext("comark-tabs", id);

  onMount(() => start(css));
</script>

<div class="ct" data-comark-frame="" data-tabs-code={code ? "" : undefined} data-code-header={code ? "" : undefined} data-tabs-magic={code ? mode : undefined} data-tabs-sync={sync || undefined}>
  <div class="ct-list" role="tablist">
    {#each labels as label, at}
      <button
        type="button"
        class="ct-tab"
        role="tab"
        id="{id}-tab-{at + 1}"
        aria-controls="{id}-panel-{at + 1}"
        aria-selected={String(at === 0)}
        tabindex={at === 0 ? 0 : -1}>{#if icons[at]}<Icon {...icons[at]} />{/if}{label}</button>
    {/each}
  </div>
  {@render children?.()}
</div>
