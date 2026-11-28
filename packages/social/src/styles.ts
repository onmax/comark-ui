import { theme } from "comark-zoom/theme";

// Simple Icons' platform logos (filled) and Lucide's count icons (stroked), drawn as masks so they take the text color.
const logos = {
  x: '<path d="M14.234 10.162L22.977 0h-2.072l-7.591 8.824L7.251 0H.258l9.168 13.343L.258 24H2.33l8.016-9.318L16.749 24h6.993zm-2.837 3.299l-.929-1.329L3.076 1.56h3.182l5.965 8.532l.929 1.329l7.754 11.09h-3.182z"/>',
  bluesky:
    '<path d="M5.202 2.857C7.954 4.922 10.913 9.11 12 11.358c1.087-2.247 4.046-6.436 6.798-8.501C20.783 1.366 24 .213 24 3.883c0 .732-.42 6.156-.667 7.037c-.856 3.061-3.978 3.842-6.755 3.37c4.854.826 6.089 3.562 3.422 6.299c-5.065 5.196-7.28-1.304-7.847-2.97c-.104-.305-.152-.448-.153-.327c0-.121-.05.022-.153.327c-.568 1.666-2.782 8.166-7.847 2.97c-2.667-2.737-1.432-5.473 3.422-6.3c-2.777.473-5.899-.308-6.755-3.369C.42 10.04 0 4.615 0 3.883c0-3.67 3.217-2.517 5.202-1.026"/>',
  mastodon:
    '<path d="M23.268 5.313c-.35-2.578-2.617-4.61-5.304-5.004C17.51.242 15.792 0 11.813 0h-.03c-3.98 0-4.835.242-5.288.309C3.882.692 1.496 2.518.917 5.127C.64 6.412.61 7.837.661 9.143c.074 1.874.088 3.745.26 5.611c.118 1.24.325 2.47.62 3.68c.55 2.237 2.777 4.098 4.96 4.857c2.336.792 4.849.923 7.256.38q.398-.092.786-.213c.585-.184 1.27-.39 1.774-.753a.06.06 0 0 0 .023-.043v-1.809a.05.05 0 0 0-.02-.041a.05.05 0 0 0-.046-.01a20.3 20.3 0 0 1-4.709.545c-2.73 0-3.463-1.284-3.674-1.818a5.6 5.6 0 0 1-.319-1.433a.053.053 0 0 1 .066-.054c1.517.363 3.072.546 4.632.546c.376 0 .75 0 1.125-.01c1.57-.044 3.224-.124 4.768-.422q.059-.011.11-.024c2.435-.464 4.753-1.92 4.989-5.604c.008-.145.03-1.52.03-1.67c.002-.512.167-3.63-.024-5.545m-3.748 9.195h-2.561V8.29c0-1.309-.55-1.976-1.67-1.976c-1.23 0-1.846.79-1.846 2.35v3.403h-2.546V8.663c0-1.56-.617-2.35-1.848-2.35c-1.112 0-1.668.668-1.67 1.977v6.218H4.822V8.102q0-1.965 1.011-3.12c.696-.77 1.608-1.164 2.74-1.164c1.311 0 2.302.5 2.962 1.498l.638 1.06l.638-1.06c.66-.999 1.65-1.498 2.96-1.498c1.13 0 2.043.395 2.74 1.164q1.012 1.155 1.012 3.12z"/>',
  threads:
    '<path d="M18.263 11.097c-.03-3.486-1.92-5.586-5.111-5.586c-2.13 0-3.922.963-4.863 2.499l2.062 1.438c.535-.843 1.272-1.543 2.628-1.543c1.528 0 2.318.85 2.544 2.431a15 15 0 0 0-2.236-.173c-4.125 0-6.068 1.867-6.068 4.336s1.943 3.99 4.804 3.99c3.139 0 5.013-2.115 5.781-4.735c.798.361 1.348 1.204 1.348 2.47c0 3.387-3.907 5.232-7.22 5.232c-4.885 0-8.077-3.207-8.077-8.424c0-6.392 4.223-10.487 9.9-10.487c3.808 0 5.69 1.671 6.97 3.914l2.108-1.475C21.44 2.078 18.331 0 13.663 0C6.227 0 1.168 5.277 1.168 12.934c0 7 4.953 11.066 10.856 11.066c4.878 0 9.809-2.846 9.809-7.716c0-2.545-1.46-4.231-3.569-5.187m-6.33 4.855c-1.077 0-2.026-.512-2.026-1.453c0-1.483 1.822-1.934 3.606-1.934c.678 0 1.34.045 1.927.173c-.422 1.927-1.671 3.215-3.508 3.214Z"/>',
  linkedin:
    '<path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037c-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85c3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.06 2.06 0 0 1-2.063-2.065a2.064 2.064 0 1 1 2.063 2.065m1.782 13.019H3.555V9h3.564zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0z"/>',
  generic:
    '<g fill="none" stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20a14.5 14.5 0 0 0 0-20M2 12h20"/></g>',
};

const icons = {
  replies:
    '<path d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092a10 10 0 1 0-4.777-4.719"/>',
  reposts:
    '<path d="m2 9l3-3l3 3"/><path d="M13 18H7a2 2 0 0 1-2-2V6m17 9l-3 3l-3-3"/><path d="M11 6h6a2 2 0 0 1 2 2v10"/>',
  quotes:
    '<path d="M16 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2a1 1 0 0 1 1 1v1a2 2 0 0 1-2 2a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1a6 6 0 0 0 6-6V5a2 2 0 0 0-2-2zM5 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2a1 1 0 0 1 1 1v1a2 2 0 0 1-2 2a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1a6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z"/>',
  likes:
    '<path d="M2 9.5a5.5 5.5 0 0 1 9.591-3.676a.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5"/>',
  views: '<path d="M12 16v5m4-7v7m4-11v11M8 12v9m-4-5v5"/>',
  bookmarks: '<path d="M19 21l-7-4l-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>',
  star: '<path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.12 2.12 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.12 2.12 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.12 2.12 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.12 2.12 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.12 2.12 0 0 0 1.597-1.16z"/>',
  thumbs:
    '<path d="M7 10v12m8-16.12L14 9.88h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88"/>',
  play: '<path fill="#000" d="M6 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L7.5 3.64A1 1 0 0 0 6 4.5"/>',
};

const svg = (body: string, attrs = "") =>
  `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"${attrs}>${body}</svg>`)}")`;
const stroked = (body: string) =>
  svg(
    body,
    ' fill="none" stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"',
  );
const mask = (variable: string) =>
  `background:currentColor;forced-color-adjust:none;-webkit-mask:var(${variable}) center/contain no-repeat;mask:var(${variable}) center/contain no-repeat`;

/**
 * A post as a card in the style of shadcn/ui's Card, on the shared `--comark-*` tokens: the avatar, name, handle, and
 * date over the text, the pictures in a grid, a quoted post in a smaller card, and the counts in the platform's order
 * with its icons. The platform's logo sits in the corner in the text color. The rules sit in the `comark` layer, so any
 * unlayered rule of the host's wins.
 */
export const css = `@layer comark{${[
  theme(".csl,.csl-thread,.csl-chat", "primary"),
  ".csl{display:block;max-width:36rem;margin:1.5rem 0;padding:1rem;border:1px solid var(--_comark-border);border-radius:calc(var(--_comark-radius) + 2px);background:var(--_comark-background);color:var(--_comark-foreground);font:400 .875rem/1.375rem var(--_comark-font);overflow-wrap:anywhere}",
  ".csl-head{display:flex;align-items:center;gap:.625rem}",
  ".csl-avatar{display:grid;flex:none;place-items:center;width:2.5rem;height:2.5rem;margin:0;border-radius:50%;background:var(--_comark-accent);color:var(--_comark-muted);font-weight:600;object-fit:cover}",
  ".csl-who{display:flex;flex:1;flex-direction:column;min-width:0}",
  ".csl-name{overflow:hidden;font-weight:600;white-space:nowrap;text-overflow:ellipsis}",
  ".csl-meta{display:flex;gap:.25rem;min-width:0;color:var(--_comark-muted);font-size:.8125rem;line-height:1.25rem;white-space:nowrap}",
  ".csl-handle{overflow:hidden;text-overflow:ellipsis}",
  ".csl-time,.csl-link{flex:none}",
  // inline-block, so a link's underline skips the dot.
  ".csl-handle+:is(.csl-time,.csl-link)::before{content:'·';display:inline-block;margin-inline-end:.25rem}",
  `.csl-logo{flex:none;align-self:flex-start;width:1.125rem;height:1.125rem;margin:.125rem;border-radius:2px;color:var(--_comark-foreground);${mask("--csl-logo")}}`,
  ...Object.entries(logos).map(
    ([platform, body]) =>
      `:is(.csl,.csl-thread,.csl-chat)[data-platform='${platform}']{--csl-logo:${svg(body)}}`,
  ),
  "a.csl-logo:focus-visible{outline:2px solid var(--_comark-ring);outline-offset:2px}",
  ".csl-text{margin-top:.75rem;font-size:.9375rem;line-height:1.5rem}",
  ".csl-text>*{margin:0}",
  ".csl-text>*+*{margin-top:.75rem}",
  ".csl-text a{border-radius:2px;color:var(--_comark-primary);text-decoration:underline;text-decoration-color:color-mix(in srgb,currentColor 40%,transparent);text-underline-offset:2px}",
  ".csl-text a:focus-visible{outline:2px solid var(--_comark-ring);outline-offset:1px}",
  ".csl-text :is(ul,ol){padding-inline-start:1.25rem}",
  ".csl-text blockquote{padding-inline-start:.75rem;border-inline-start:2px solid var(--_comark-border);color:var(--_comark-muted)}",
  ".csl-text code{padding:.125rem .25rem;border-radius:4px;background:var(--_comark-accent);font-size:.8125rem}",
  ".csl-text pre{overflow:auto;padding:.75rem;border-radius:var(--_comark-radius);background:var(--_comark-accent);font-size:.8125rem;line-height:1.25rem}",
  ".csl-text pre code{padding:0;background:none}",
  ".csl-media{display:grid;gap:2px;margin-top:.75rem;overflow:hidden;border:1px solid var(--_comark-border);border-radius:var(--_comark-radius);background:var(--_comark-border)}",
  ".csl-media:not([data-count='1']){grid-template-columns:repeat(2,minmax(0,1fr));grid-auto-rows:minmax(0,1fr);aspect-ratio:16/9}",
  ".csl-media[data-count='3']>:first-child{grid-row:span 2}",
  ".csl-media>*{min-width:0;min-height:0;margin:0;background:var(--_comark-accent)}",
  ".csl-media img{display:block;width:100%;height:100%;margin:0;border-radius:0;object-fit:cover}",
  ".csl-media[data-count='1'] img{height:auto;max-height:32rem}",
  ".csl-video{position:relative;display:block}",
  `.csl-video::after{content:'';position:absolute;top:50%;left:50%;width:3rem;height:3rem;margin:-1.5rem 0 0 -1.5rem;border-radius:50%;background:rgb(0 0 0/.6) ${svg(icons.play.replace('fill="#000"', 'fill="#fff"'))} 55% 50%/1.25rem no-repeat;pointer-events:none}`,
  ".csl[data-quote]{max-width:none;margin:.75rem 0 0;padding:.75rem;border-radius:var(--_comark-radius)}",
  ".csl[data-quote] .csl-head{gap:.375rem}",
  ".csl[data-quote] .csl-avatar{width:1.25rem;height:1.25rem;font-size:.625rem}",
  ".csl[data-quote] .csl-who{flex-direction:row;align-items:baseline;gap:.375rem}",
  ".csl[data-quote] .csl-text{margin-top:.375rem;font-size:.875rem;line-height:1.375rem}",
  ".csl[data-quote] .csl-media{margin-top:.5rem}",
  ".csl-counts{display:flex;flex-wrap:wrap;gap:.25rem 1.5rem;margin-top:.75rem;color:var(--_comark-muted);font-size:.8125rem;line-height:1.25rem}",
  ".csl-count{display:inline-flex;align-items:center;gap:.375rem;font-variant-numeric:tabular-nums}",
  `.csl-count::before{content:'';flex:none;width:1rem;height:1rem;${mask("--csl-icon")}}`,
  ...(["replies", "reposts", "quotes", "likes", "views", "bookmarks"] as const).map(
    (count) => `.csl-count[data-count='${count}']{--csl-icon:${stroked(icons[count])}}`,
  ),
  `.csl[data-platform='mastodon']>.csl-counts>[data-count='likes']{--csl-icon:${stroked(icons.star)}}`,
  `.csl[data-platform='linkedin']>.csl-counts>[data-count='likes']{--csl-icon:${stroked(icons.thumbs)}}`,
  // A thread is one card: each post a row with its avatar in a column of its own, joined to the next by the rail.
  ".csl-thread{position:relative;display:block;max-width:36rem;margin:1.5rem 0;padding:1rem;border:1px solid var(--_comark-border);border-radius:calc(var(--_comark-radius) + 2px);background:var(--_comark-background);color:var(--_comark-foreground);font:400 .875rem/1.375rem var(--_comark-font);overflow-wrap:anywhere}",
  ".csl-thread>.csl-logo{position:absolute;top:1rem;right:1rem;margin:.125rem}",
  ".csl-thread>.csl:nth-child(2) .csl-who{padding-inline-end:1.75rem}",
  ".csl[data-thread]{position:relative;max-width:none;margin:0;padding:0;border:0;border-radius:0;background:none}",
  ".csl[data-thread]:not([data-focal]){min-height:2.5rem;padding-inline-start:3.125rem}",
  ".csl[data-thread]:not([data-focal])>.csl-head>.csl-avatar{position:absolute;top:0;left:0}",
  ".csl[data-thread]:not([data-focal])>.csl-text{margin-top:.125rem}",
  ".csl[data-rail]{padding-bottom:1rem}",
  ".csl[data-rail]::before{content:'';position:absolute;top:2.75rem;bottom:.25rem;left:calc(1.25rem - 1px);width:2px;border-radius:1px;background:var(--_comark-border)}",
  ".csl[data-focal]>.csl-text{font-size:1.0625rem;line-height:1.625rem}",
  ".csl-stamp{display:flex;flex-wrap:wrap;gap:.25rem;margin-top:.75rem;color:var(--_comark-muted);font-size:.8125rem;line-height:1.25rem}",
  ".csl-stamp>*+*::before{content:'·';margin-inline-end:.25rem}",
  ".csl-number{color:var(--_comark-foreground);font-weight:600;font-variant-numeric:tabular-nums}",
  ".csl[data-focal]>.csl-counts{padding-top:.75rem;border-top:1px solid var(--_comark-border)}",
  ".csl-link{border-radius:2px;color:inherit;text-decoration:none}",
  ".csl-link:hover{text-decoration:underline}",
  ".csl-link:focus-visible{outline:2px solid var(--_comark-ring);outline-offset:1px}",
  ".csl-earlier>summary{position:relative;display:block;min-height:2.5rem;padding:.5625rem 0 1rem 3.125rem;color:var(--_comark-primary);font-size:.8125rem;line-height:1.375rem;cursor:pointer;list-style:none}",
  ".csl-earlier>summary::-webkit-details-marker{display:none}",
  ".csl-earlier>summary::before{content:'';position:absolute;top:.25rem;bottom:.25rem;left:calc(1.25rem - 1px);border-inline-start:2px dotted var(--_comark-border)}",
  ".csl-earlier>summary:hover{text-decoration:underline}",
  ".csl-earlier>summary:focus-visible{border-radius:2px;outline:2px solid var(--_comark-ring);outline-offset:-2px}",
  ".csl-earlier[open]>summary .csl-closed,.csl-earlier:not([open])>summary .csl-opened{display:none}",
  // A conversation is one card: a header, then bubbles, the reader's own on the right in the brand color.
  ".csl-chat{display:block;max-width:36rem;margin:1.5rem 0;overflow:hidden;border:1px solid var(--_comark-border);border-radius:calc(var(--_comark-radius) + 2px);background:var(--_comark-background);color:var(--_comark-foreground);font:400 .875rem/1.375rem var(--_comark-font);overflow-wrap:anywhere}",
  ".csl-chat-head{display:flex;align-items:center;gap:.5rem;min-height:3rem;padding:.625rem 1rem;border-bottom:1px solid var(--_comark-border)}",
  ".csl-chat-title{flex:1;min-width:0;overflow:hidden;font-weight:600;white-space:nowrap;text-overflow:ellipsis}",
  ".csl-chat-head>.csl-logo{margin-inline-start:auto}",
  ".csl-request{flex:none;padding:0 .5rem;border:1px solid var(--_comark-border);border-radius:999px;color:var(--_comark-muted);font-size:.75rem;line-height:1.25rem}",
  ".csl-messages{display:flex;flex-direction:column;gap:.125rem;margin:0;padding:1rem;list-style:none}",
  ".csl-message{display:flex;align-items:flex-end;gap:.5rem;max-width:85%;margin:0;padding:0}",
  ".csl-message[data-start]:not(:first-child){margin-top:.625rem}",
  ".csl-message:not([data-me]){padding-inline-start:2.5rem}",
  ".csl-message:not([data-me])[data-end]{padding-inline-start:0}",
  ".csl-message[data-me]{align-self:flex-end;justify-content:flex-end}",
  ".csl-message>.csl-avatar{width:2rem;height:2rem;font-size:.8125rem}",
  ".csl-body{display:flex;flex-direction:column;align-items:flex-start;gap:.125rem;min-width:0}",
  ".csl-message[data-me]>.csl-body{align-items:flex-end}",
  ".csl-from{padding-inline:.75rem;color:var(--_comark-muted);font-size:.75rem;line-height:1rem}",
  ".csl-bubble{max-width:100%;padding:.5rem .875rem;border-radius:1.125rem;background:var(--_comark-accent)}",
  ".csl-message:not([data-me]):not([data-end])>.csl-body>.csl-bubble{border-end-start-radius:.375rem}",
  ".csl-message:not([data-me]):not([data-start])>.csl-body>.csl-bubble{border-start-start-radius:.375rem}",
  ".csl-message[data-me]:not([data-end])>.csl-body>.csl-bubble{border-end-end-radius:.375rem}",
  ".csl-message[data-me]:not([data-start])>.csl-body>.csl-bubble{border-start-end-radius:.375rem}",
  ".csl-message[data-me] .csl-bubble{background:var(--_comark-primary);color:var(--_comark-primary-foreground)}",
  ".csl-bubble>.csl-text{margin:0}",
  ".csl-message[data-me] .csl-text a{color:inherit}",
  ".csl-message[data-me] .csl-text blockquote{color:inherit;border-inline-start-color:color-mix(in srgb,currentColor 45%,transparent)}",
  ".csl-message[data-me] .csl-text pre{color:var(--_comark-foreground)}",
  ".csl-message[data-me] .csl-text code:not(pre code){background:color-mix(in srgb,currentColor 5%,transparent)}",
  ".csl-bubble>.csl-media{margin:.375rem -.5rem -.125rem;border-radius:.75rem}",
  ".csl-bubble>.csl-media:first-child,.csl-bubble>.csl-sr+.csl-media{margin-top:-.125rem}",
  ".csl-body>.csl-time{padding-inline:.75rem;color:var(--_comark-muted);font-size:.6875rem;line-height:1rem}",
  ".csl-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}",
].join("")}}`;
