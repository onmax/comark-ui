<!-- Each entry of a `::file-tree` for `@comark/svelte`. -->
<script>
  import { glyphs, marks } from "comark-file-tree/client";
  import { Icon } from "comark-icon/svelte";

  let {
    type = undefined,
    name = undefined,
    state = undefined,
    note = undefined,
    icon = undefined,
    children,
  } = $props();
  const folder = $derived(type === "folder");
  const mark = $derived(marks.get(String(state)));
</script>

{#snippet entry()}
  <span class="cft-entry">{#if icon?.src}<Icon {...icon} />{:else}<svg class="cft-glyph" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d={folder ? glyphs.folder : glyphs.file} /></svg>{/if}{#if mark}<span class="cft-mark">{mark}</span>{/if}<span class="cft-name">{name}</span>{#if note}<span class="cft-note">{note}</span>{/if}</span>
{/snippet}

{#if type === "more"}
  <li data-type="more">…</li>
{:else if folder}
  <li data-type="folder" data-state={mark ? state : undefined}><details open><summary>{@render entry()}</summary><ul>{@render children?.()}</ul></details></li>
{:else}
  <li data-type="file" data-state={mark ? state : undefined}>{@render entry()}</li>
{/if}
