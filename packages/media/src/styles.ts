import { theme } from "comark-zoom/theme";

// The rest of the track is the foreground, faded, since the accent barely shows on the bar.
const track =
  "height:.375rem;border-radius:999px;background:linear-gradient(var(--_cm-fill),var(--_cm-primary) var(--cm-at,0%),color-mix(in srgb,var(--_comark-foreground) 25%,transparent) var(--cm-at,0%))";
const thumb =
  "box-sizing:border-box;width:1rem;height:1rem;border:1px solid var(--_cm-primary);border-radius:50%;background:var(--_comark-background);box-shadow:0 1px 2px rgb(0 0 0/.1)";
const ring = "box-shadow:0 0 0 3px color-mix(in srgb,var(--_comark-ring) 50%,transparent)";

/**
 * Videos the page's width at most, in a frame on the shared `--comark-*` tokens, with a bar of controls over their
 * bottom edge, and audio players the page's width. The rules sit in the `comark` layer, so any unlayered rule of the
 * host's wins.
 */
export const css = `@layer comark{${[
  theme(".cm"),
  ":where(.cm){--_cm-primary:var(--ui-primary,var(--primary,var(--_comark-foreground)));--_cm-on-primary:var(--primary-foreground,var(--_comark-background))}",
  ".cm{display:block;box-sizing:border-box;max-width:100%;margin:1rem 0}",
  // The accent tint shows where the video will be before its first frame loads.
  "video.cm,.cm-video{border:1px solid var(--_comark-border);border-radius:var(--_comark-radius);background:var(--_comark-accent)}",
  // Until its metadata loads, a video is the browser's 2:1 box; most are 16:9, so it takes that room and keeps its own
  // ratio once known.
  "video.cm,.cm-video>video{aspect-ratio:auto 16/9}",
  "video.cm{height:auto}",
  ".cm-video{position:relative;width:fit-content;overflow:hidden}",
  // Typeset gives a video a top margin, which inside the frame would push it down and crop its bottom.
  ".cm-video>video{display:block;max-width:100%;height:auto;margin:0}",
  ".cm-video[data-media-ready]:not([data-error])>video{cursor:pointer}",
  ".cm-video:fullscreen{display:grid;place-items:center;width:100%;max-width:none;margin:0;border:0;border-radius:0;background:#000}",
  ".cm-video:fullscreen>video{width:100%;height:100%;max-width:none;object-fit:contain}",
  "audio.cm,.cm-audio>audio{display:block;width:100%}",
  // The browser's player shows until the script reaches the player, and again if the file can't play, so it can say why.
  ".cm-bar{display:none}",
  ".cm-audio[data-media-ready]:not([data-error])>audio{display:none}",
  ":is(.cm-audio,.cm-video)[data-media-ready]:not([data-error])>.cm-bar{display:flex}",
  ".cm-bar{container-type:inline-size;flex-wrap:wrap;align-items:center;gap:.75rem;box-sizing:border-box;padding:.5rem .75rem .5rem .5rem;border:1px solid var(--_comark-border);border-radius:var(--_comark-radius);background:var(--_comark-background);color:var(--_comark-foreground);font:.875rem/1.25rem var(--_comark-font)}",
  ".cm-bar button{display:inline-grid;place-items:center;flex:none;width:2rem;height:2rem;margin:0;padding:0;border:0;cursor:pointer;touch-action:manipulation;transition:background .15s,opacity .15s}",
  `.cm-bar button:focus-visible{outline:none;${ring}}`,
  ".cm-bar svg{width:1rem;height:1rem}",
  ".cm-play{border-radius:999px;background:var(--_cm-primary);color:var(--_cm-on-primary)}",
  ".cm-play:hover{opacity:.9}",
  // A triangle looks off-center when its box is centered.
  ".cm-play .cm-icon-play{translate:1px 0}",
  // Over a video, the bar floats above its bottom edge, and fades out while it plays unless the pointer is on it.
  ".cm-video>.cm-bar{position:absolute;inset:auto .5rem .5rem;gap:.5rem;padding:.25rem .5rem .25rem .25rem;background:color-mix(in srgb,var(--_comark-background) 85%,transparent);box-shadow:0 1px 3px rgb(0 0 0/.1);backdrop-filter:blur(8px);transition:opacity .2s}",
  ".cm-video[data-playing]:not(:hover,:focus-within)>.cm-bar{opacity:0}",
  // Over a picture a filled button reads as a blot, so a video's play button is plain like the others, and every button's
  // corners follow the bar's.
  ".cm-video .cm-bar button{border-radius:calc(var(--_comark-radius) - .25rem)}",
  ".cm-video .cm-play{background:none;color:var(--_comark-foreground)}",
  ".cm-video .cm-bar button:hover{opacity:1;background:color-mix(in srgb,var(--_comark-foreground) 8%,transparent);color:var(--_comark-foreground)}",
  ":is(.cm-mute,.cm-full){border-radius:calc(var(--_comark-radius) - 2px);background:none;color:var(--_comark-muted)}",
  ":is(.cm-mute,.cm-full):hover{background:var(--_comark-accent);color:var(--_comark-foreground)}",
  ".cm-bar button[hidden]{display:none}",
  ".cm-icon-pause,.cm-icon-muted,.cm-icon-exit,[data-playing] .cm-icon-play,[data-muted] .cm-icon-volume,[data-fullscreen] .cm-icon-full{display:none}",
  "[data-playing] .cm-icon-pause,[data-muted] .cm-icon-muted,[data-fullscreen] .cm-icon-exit{display:block}",
  ".cm-time{flex:none;color:var(--_comark-muted);font-variant-numeric:tabular-nums}",
  ".cm-seek{--_cm-fill:to right;flex:1 1 0;min-width:0;height:1rem;margin:0;background:none;appearance:none;cursor:pointer}",
  ".cm-seek:dir(rtl){--_cm-fill:to left}",
  ".cm-seek:disabled{opacity:.5;cursor:default}",
  ".cm-seek:focus-visible{outline:none}",
  // Each engine drops a whole rule over a pseudo-element it doesn't know, so every one gets its own.
  `.cm-seek::-webkit-slider-runnable-track{${track}}`,
  `.cm-seek::-moz-range-track{${track}}`,
  `.cm-seek::-webkit-slider-thumb{${thumb};margin-top:-.3125rem;appearance:none}`,
  `.cm-seek::-moz-range-thumb{${thumb}}`,
  `.cm-seek:focus-visible::-webkit-slider-thumb{${ring}}`,
  `.cm-seek:focus-visible::-moz-range-thumb{${ring}}`,
  // A narrow player can't fit the seek bar between the times and the buttons, so it gets a row of its own above them,
  // with the times together after the play button. A very narrow one drops the times.
  '@container (width<24rem){.cm-seek{flex-basis:100%;order:-1}.cm-bar>.cm-mute{margin-inline-start:auto}.cm-seek+.cm-time{margin-inline-start:-.75rem}.cm-video .cm-seek+.cm-time{margin-inline-start:-.5rem}.cm-seek+.cm-time::before{content:"\\a0/\\a0"}}',
  "@container (width<16rem){.cm-time{display:none}}",
  // Three touch buttons plus two hour-form times need more room than the desktop controls.
  "@media (pointer:coarse){.cm-bar button{width:2.5rem;height:2.5rem}@container (width<18rem){.cm-video .cm-time{display:none}}}",
].join("")}}`;
