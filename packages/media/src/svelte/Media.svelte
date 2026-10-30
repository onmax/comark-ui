<!-- Videos and audio for `@comark/svelte`. -->
<script>
  import { controls, css, start } from "comark-media/client";

  let {
    kind = undefined,
    src = undefined,
    label = undefined,
    poster = undefined,
    width = undefined,
    height = undefined,
    autoplay = false,
    loop = false,
    muted = false,
    native = false,
  } = $props();
  $effect(() => {
    if ((kind === "video" || kind === "audio") && src && !native) {
      const stop = start(css);
      return stop;
    }
  });
</script>

{#if kind === "video" && src && native}
  <video class="cm" {src} controls playsinline preload="metadata" {poster} {width} {height} {autoplay} {loop} {muted} aria-label={label || undefined}><a href={src}>{label || src}</a></video>
{:else if kind === "audio" && src && native}
  <audio class="cm" {src} controls preload="metadata" {autoplay} {loop} {muted} aria-label={label || undefined}><a href={src}>{label || src}</a></audio>
{:else if kind === "video" && src}
  <span class="cm cm-video" role={label ? "group" : undefined} aria-label={label || undefined}><video {src} controls playsinline preload="metadata" {poster} {width} {height} {autoplay} {loop} {muted} aria-label={label || undefined}><a href={src}>{label || src}</a></video><span class="cm-bar">{@html controls("video")}</span></span>
{:else if kind === "audio" && src}
  <span class="cm cm-audio" role={label ? "group" : undefined} aria-label={label || undefined}><audio {src} controls preload="metadata" {autoplay} {loop} {muted} aria-label={label || undefined}><a href={src}>{label || src}</a></audio><span class="cm-bar">{@html controls("audio")}</span></span>
{/if}
