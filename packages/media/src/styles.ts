import { theme } from "comark-zoom/theme";

// The rest of the track is the foreground, faded, since the accent barely shows on the bar.
const track =
  "height:.375rem;border-radius:9999px;background:linear-gradient(var(--_cm-fill),var(--_cm-primary) var(--cm-at,0%),color-mix(in srgb,var(--_comark-foreground) 25%,transparent) var(--cm-at,0%))";
const thumb =
  "box-sizing:border-box;width:1rem;height:1rem;border:1px solid var(--_cm-primary);border-radius:50%;background:var(--_comark-background)";
// The volume panel opens fast and closes faster, since the reader has already moved on.
const level =
  "opacity:1;scale:1;pointer-events:auto;transition:opacity .15s cubic-bezier(.32,.72,0,1),scale .15s cubic-bezier(.32,.72,0,1)";
// Whatever floats over a picture sits on the page's background, nearly opaque, so it reads over a white frame or a black one.
const glass =
  "border:1px solid var(--_comark-border);background:color-mix(in srgb,var(--_comark-background) 90%,transparent);box-shadow:var(--_comark-shadow);backdrop-filter:blur(8px)";
const open =
  "visibility:visible;opacity:1;scale:1;transition:opacity .15s cubic-bezier(.32,.72,0,1),scale .15s cubic-bezier(.32,.72,0,1)";
const ring = "box-shadow:0 0 0 3px color-mix(in srgb,var(--_comark-ring) 50%,transparent)";

/**
 * Videos the page's width at most, in a frame on the shared `--comark-*` tokens, with a bar of controls over their
 * bottom edge, and audio players the page's width. The rules sit in the `comark` layer, so any unlayered rule of the
 * host's wins.
 */
export const css = `@layer comark{${[
  theme(".cm", "primary", "shadow"),
  ":where(.cm){--_cm-primary:var(--_comark-primary);--_cm-on-primary:var(--_comark-primary-foreground)}",
  ".cm{display:block;box-sizing:border-box;max-width:100%;margin:1rem 0}",
  // The accent tint shows where the video will be before its first frame loads.
  "video.cm,.cm-video{border:1px solid var(--_comark-border);border-radius:var(--_comark-radius);background:var(--_comark-accent)}",
  // A video with its `width` and `height` keeps that room until it loads. Without them, it's the browser's 2:1 box until
  // its metadata loads; most are 16:9, so it takes that room and keeps its own ratio once known.
  ":is(video.cm,.cm-video>video):not([width][height]){aspect-ratio:auto 16/9}",
  "video.cm{height:auto}",
  // Round the video itself so the volume panel can extend above a short frame.
  ".cm-video{position:relative;width:fit-content}",
  // Typeset gives a video a top margin, which inside the frame would push it down and crop its bottom.
  ".cm-video>video{display:block;max-width:100%;height:auto;margin:0;border-radius:inherit}",
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
  ".cm-play{border-radius:9999px;background:var(--_cm-primary);color:var(--_cm-on-primary)}",
  "@media (hover:hover){.cm-play:hover{opacity:.9}}",
  // A triangle looks off-center when its box is centered.
  ".cm-play .cm-icon-play{translate:1px 0}",
  // Over a video, the bar floats above its bottom edge, and fades out while it plays unless the pointer is on it.
  `.cm-video>.cm-bar{position:absolute;inset:auto .5rem .5rem;gap:.5rem;padding:.25rem .5rem .25rem .25rem;${glass};transition:opacity .2s}`,
  ".cm-video[data-playing]:not(:hover,:focus-within,[data-menu])>.cm-bar{opacity:0}",
  // The muted gray is too faint over a dark frame showing through the bar.
  ".cm-video .cm-time{color:var(--_comark-foreground)}",
  // Over a picture a filled button reads as a blot, so a video's play button is plain like the others, and every button's
  // corners follow the bar's.
  ".cm-video .cm-bar button{border-radius:calc(var(--_comark-radius) - .25rem)}",
  ".cm-video .cm-play{background:none;color:var(--_comark-foreground)}",
  ":is(.cm-mute,.cm-settings,.cm-full){border-radius:calc(var(--_comark-radius) - 2px);background:none;color:var(--_comark-muted)}",
  "@media (hover:hover){:is(.cm-mute,.cm-settings,.cm-full):hover{background:var(--_comark-accent);color:var(--_comark-foreground)}.cm-video .cm-bar button:hover{opacity:1;background:color-mix(in srgb,var(--_comark-foreground) 8%,transparent);color:var(--_comark-foreground)}}",
  ".cm-settings[aria-expanded=true]{background:var(--_comark-accent);color:var(--_comark-foreground)}",
  ".cm-bar button[hidden]{display:none}",
  ".cm-icon-pause,.cm-icon-muted,.cm-icon-exit,[data-playing] .cm-icon-play,[data-muted] .cm-icon-volume,[data-fullscreen] .cm-icon-full{display:none}",
  "[data-playing] .cm-icon-pause,[data-muted] .cm-icon-muted,[data-fullscreen] .cm-icon-exit{display:block}",
  // The volume sits in a panel over the mute button, opened by the pointer or the keyboard, so the seek bar keeps its
  // width. A touch screen sets the volume with its own buttons, and an iPhone ignores the page's.
  ".cm-sound{position:relative;display:flex;flex:none}",
  // Opacity keeps the slider in both tab directions; disable pointer hits while the panel is closed.
  ".cm-level{position:absolute;bottom:calc(100% + .5rem);left:50%;translate:-50% 0;display:flex;padding:.75rem .5rem;border:1px solid var(--_comark-border);border-radius:var(--_comark-radius);background:var(--_comark-background);box-shadow:var(--_comark-shadow);transform-origin:bottom;opacity:0;scale:.96;pointer-events:none;transition:opacity .1s ease-in,scale .1s ease-in}",
  // Covers the gap down to the button, so the pointer can cross it without closing the panel.
  '.cm-level::before{content:"";position:absolute;inset:100% 0 -.5rem}',
  `.cm-sound:is(:hover,:has(:focus-visible,:active))>.cm-level{${level}}`,
  "@media (hover:none),(pointer:coarse){.cm-level{display:none}}",
  // The settings panel holds a row of choices for each setting, like shadcn/ui's tabs, and opens on a click so touch
  // screens get it too. Visibility keeps its choices out of the tab order while it's closed.
  ".cm-more{position:relative;display:flex;flex:none}",
  `.cm-menu{position:absolute;bottom:calc(100% + .5rem);right:0;z-index:1;display:grid;grid-template-columns:auto auto;align-items:center;gap:.375rem 1.5rem;width:max-content;box-sizing:border-box;padding:.5rem .5rem .5rem .75rem;border:1px solid var(--_comark-border);border-radius:var(--_comark-radius);background:var(--_comark-background);box-shadow:var(--_comark-shadow);color:var(--_comark-foreground);transform-origin:bottom right;visibility:hidden;opacity:0;scale:.96;transition:opacity .1s ease-in,scale .1s ease-in,visibility 0s .1s}`,
  `[data-menu] .cm-menu{${open}}`,
  ".cm-option{display:flex;align-items:center;gap:.5rem;font-weight:500}",
  ".cm-option svg{color:var(--_comark-muted)}",
  ".cm-choices{display:flex;justify-self:end;padding:3px;border-radius:var(--_comark-radius);background:var(--_comark-accent)}",
  ".cm-choices label{position:relative;display:grid;place-items:center;min-width:2.75rem;height:1.75rem;box-sizing:border-box;padding:0 .5rem;border-radius:calc(var(--_comark-radius) - 3px);color:var(--_comark-muted);font-weight:500;font-variant-numeric:tabular-nums;white-space:nowrap;cursor:pointer;transition:color .15s,background .15s,box-shadow .15s}",
  // The radio covers its label, so the whole choice is its hit area.
  ".cm-choices input{position:absolute;inset:0;margin:0;opacity:0;cursor:inherit}",
  ".cm-choices label:has(:checked){background:var(--_comark-background);color:var(--_comark-foreground);box-shadow:0 1px 2px rgb(0 0 0/.08)}",
  "@media (hover:hover){.cm-choices label:hover{color:var(--_comark-foreground)}}",
  `.cm-choices label:has(:focus-visible){${ring}}`,
  "@container (width<24rem){.cm-menu{grid-template-columns:auto;gap:.25rem}.cm-choices{justify-self:start;margin-bottom:.25rem}}",
  "@media (prefers-reduced-motion:reduce){:is(.cm-level,.cm-menu){transition:none}}",
  // Vertical, with silence at the bottom.
  ".cm-volume{--_cm-fill:to top;width:1rem;height:5rem;margin:0;background:none;appearance:none;cursor:pointer;writing-mode:vertical-lr;direction:rtl}",
  ".cm-time{flex:none;color:var(--_comark-muted);font-variant-numeric:tabular-nums}",
  ".cm-seek{--_cm-fill:to right;flex:1 1 0;min-width:0;height:1rem;margin:0;background:none;appearance:none;cursor:pointer}",
  ".cm-seek:dir(rtl){--_cm-fill:to left}",
  ".cm-seek:disabled{opacity:.5;cursor:default}",
  ":is(.cm-seek,.cm-volume):focus-visible{outline:none}",
  // Each engine drops a whole rule over a pseudo-element it doesn't know, so every one gets its own.
  `:is(.cm-seek,.cm-volume)::-webkit-slider-runnable-track{${track}}`,
  `:is(.cm-seek,.cm-volume)::-moz-range-track{${track}}`,
  `:is(.cm-seek,.cm-volume)::-webkit-slider-thumb{${thumb};margin-top:-.3125rem;appearance:none}`,
  `:is(.cm-seek,.cm-volume)::-moz-range-thumb{${thumb}}`,
  `:is(.cm-seek,.cm-volume):focus-visible::-webkit-slider-thumb{${ring}}`,
  `:is(.cm-seek,.cm-volume):focus-visible::-moz-range-thumb{${ring}}`,
  ".cm-volume::-webkit-slider-runnable-track{width:.375rem;height:100%}",
  ".cm-volume::-moz-range-track{width:.375rem;height:100%}",
  ".cm-volume::-webkit-slider-thumb{margin:0 0 0 -.3125rem}",
  // A narrow player can't fit the seek bar between the times and the buttons, so it gets a row of its own above them,
  // with the times together after the play button. A very narrow one drops the times.
  '@container (width<24rem){.cm-seek{flex-basis:100%;order:-1}.cm-bar>.cm-sound{margin-inline-start:auto}.cm-seek+.cm-time{margin-inline-start:-.75rem}.cm-video .cm-seek+.cm-time{margin-inline-start:-.5rem}.cm-seek+.cm-time::before{content:"\\a0/\\a0"}}',
  "@container (width<16rem){.cm-time{display:none}}",
  // Three touch buttons plus two hour-form times need more room than the desktop controls.
  "@media (pointer:coarse){.cm-bar button{width:2.5rem;height:2.5rem}@container (width<18rem){.cm-video .cm-time{display:none}}}",
  // On a touch screen a video's controls spread over it, as phone players do: play in the middle, the sound and
  // settings in the top corner, out of the thumb's way, and the time along the bottom. Each sits on its own surface,
  // since a picture can be any color, and the gaps between them pass taps to the video.
  `@media (pointer:coarse){${[
    ".cm-video[data-media-ready]:not([data-error])>.cm-bar{inset:0;display:grid;grid-template:auto 1fr auto/auto 1fr auto auto;gap:.5rem;padding:.75rem;border:0;border-radius:inherit;background:none;box-shadow:none;backdrop-filter:none;pointer-events:none}",
    // The surface behind the time blurs what is behind it, which paints it over items without a z-index.
    ".cm-video>.cm-bar>*{z-index:1;pointer-events:auto}",
    `.cm-video>.cm-bar::before{content:"";grid-area:3/1/4/-1;align-self:stretch;margin:-.25rem;border-radius:var(--_comark-radius);${glass}}`,
    `.cm-video>.cm-bar>.cm-play{grid-area:2/1/3/-1;place-self:center;width:3.5rem;height:3.5rem;border-radius:9999px;${glass}}`,
    ".cm-video>.cm-bar>.cm-play svg{width:1.5rem;height:1.5rem}",
    `.cm-video>.cm-bar>:is(.cm-sound,.cm-more)>button{border-radius:9999px;${glass};color:var(--_comark-foreground)}`,
    ".cm-video>.cm-bar>.cm-sound{grid-area:1/3;justify-self:end;margin:0}",
    ".cm-video>.cm-bar>.cm-more{grid-area:1/4;z-index:2}",
    ".cm-video>.cm-bar>.cm-play+.cm-time{grid-area:3/1;align-self:center;padding-inline-start:.5rem}",
    ".cm-video>.cm-bar>.cm-seek{grid-area:3/2;align-self:center;order:0}",
    ".cm-video>.cm-bar>.cm-seek+.cm-time{grid-area:3/3;align-self:center;justify-self:end;margin:0}",
    ".cm-video>.cm-bar>.cm-seek+.cm-time::before{content:none}",
    ".cm-video>.cm-bar>.cm-full{grid-area:3/4}",
    ".cm-video .cm-menu{top:calc(100% + .5rem);bottom:auto;transform-origin:top right}",
  ].join("")}}`,
].join("")}}`;
