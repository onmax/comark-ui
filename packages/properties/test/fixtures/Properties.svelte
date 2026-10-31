<script>
  import Properties from "../../src/svelte/Properties.svelte";

  let date = $state("2026-10-23");
  let text = $state("Oct 23, 2026");
  export function update(nextDate, nextText) {
    date = nextDate;
    text = nextText;
  }
</script>

<Properties>
  <div data-key="date"><dt>Date</dt><dd>{#if date}<time datetime={date}>{text}</time>{/if}</dd></div>
  <div><dt>Fixed</dt><dd><time datetime="2026-10-23" lang="de-DE">23. Okt. 2026</time></dd></div>
</Properties>
