<!-- A document the e2e test can replace, as an app does when its Markdown changes. -->
<script>
  import { MarkdownDocument } from "@comark/svelte";
  import { components } from "../../src/svelte/index.js";

  let { initial } = $props();
  let value = $state.raw(initial);
  export function update(next) {
    value = next;
  }
</script>

<MarkdownDocument {value} {components} />
