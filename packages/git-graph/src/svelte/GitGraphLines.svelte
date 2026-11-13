<!-- The lines and dots of a `::git-graph`, an SVG the parse plugin drew and escaped. -->
<script>
  let { svg = "" } = $props();
</script>

<div class="cgg-lines">{@html svg}</div>
