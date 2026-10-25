<!-- A text or reasoning part's Markdown, rendered by `@comark/svelte`. -->
<script>
  import { Markdown } from "@comark/svelte";

  let { value = "", streaming = false, plugins, components, options } = $props();
</script>

<div class="cht-text">
  <Markdown {value} {streaming} caret={streaming} {plugins} {components} {options} />
</div>
