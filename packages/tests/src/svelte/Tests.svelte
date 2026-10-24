<!-- `::tests` for `@comark/svelte`. -->
<script>
  import { onMount } from "svelte";
  import { addStyles, summary } from "comark-tests/client";

  let {
    passed = 0,
    failed = 0,
    skipped = 0,
    duration = undefined,
    title = undefined,
    children,
  } = $props();
  onMount(addStyles);
</script>

<section class="ctr" data-status={failed ? "failed" : "passed"} aria-label={title || "Test results"}>
  <p class="ctr-summary">{#if title}<strong class="ctr-title">{title}</strong>{/if}{#each summary({ passed, failed, skipped }) as count}<span class="ctr-count" data-kind={count.kind}>{count.text}</span>{/each}{#if duration}<span class="ctr-time">{duration}</span>{/if}</p>
  {@render children?.()}
</section>
