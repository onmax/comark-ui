<!-- `::carousel` for `@comark/svelte`. -->
<script>
  import { onMount } from "svelte";
  import { css, start } from "comark-carousel/client";
  import { css as zoomCss, start as startZoom } from "comark-zoom/client";

  let { count = 0, columns = 1, title = undefined, zoom = undefined, children } = $props();
  const off = (value) => value === false || value === "false";
  const total = $derived(Number(count) || 0);
  const perView = $derived(Math.min(3, Math.max(1, Number(columns) || 1)));

  onMount(() => {
    const stops = [start(css), ...(off(zoom) ? [] : [startZoom(zoomCss)])];
    return () => stops.forEach((stop) => stop());
  });
</script>

<div
  class="cc"
  data-comark-frame=""
  data-carousel-columns={perView > 1 ? String(perView) : undefined}
  data-carousel-fits={total <= perView ? "" : undefined}
  data-zoom-gallery={off(zoom) ? undefined : ""}
  role="region"
  aria-roledescription="carousel"
  aria-label={title ?? "Carousel"}
>
  <div class="cc-track">{@render children?.()}</div>
  {#if total > 1}
    <div class="cc-controls">
      <span class="cc-count" aria-live="polite">1 / {total}</span>
      <div class="cc-steps">
        <button type="button" class="cc-step" data-carousel-step="-1" aria-label="Previous slide" aria-disabled="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
        </button>
        <button type="button" class="cc-step" data-carousel-step="1" aria-label="Next slide">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
        </button>
      </div>
    </div>
  {/if}
</div>
