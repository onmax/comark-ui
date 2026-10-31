import { theme } from "comark-zoom/theme";

// Lucide's icons, one per kind of row, drawn as masks so they take the label's color.
const icons = {
  status:
    '<path d="M10.1 2.182a10 10 0 0 1 3.8 0m0 19.636a10 10 0 0 1-3.8 0m7.509-18.097a10 10 0 0 1 2.69 2.7M2.182 13.9a10 10 0 0 1 0-3.8m18.097 7.509a10 10 0 0 1-2.7 2.69M21.818 10.1a10 10 0 0 1 0 3.8M3.721 6.391a10 10 0 0 1 2.7-2.69m-.03 16.578a10 10 0 0 1-2.69-2.7"/>',
  pr: '<circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M13 6h3a2 2 0 0 1 2 2v7M6 9v12"/>',
  person: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  date: '<path d="M8 2v3m8-3v3"/><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/>',
  tags: '<path d="M13.172 2a2 2 0 0 1 1.414.586l6.71 6.71a2.4 2.4 0 0 1 0 3.408l-4.592 4.592a2.4 2.4 0 0 1-3.408 0l-6.71-6.71A2 2 0 0 1 6 9.172V3a1 1 0 0 1 1-1zM2 7v6.172a2 2 0 0 0 .586 1.414l6.71 6.71a2.4 2.4 0 0 0 3.191.193"/><circle cx="10.5" cy="6.5" r=".5"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  number: '<path d="M4 9h16M4 15h16M10 3L8 21m8-18l-2 18"/>',
  boolean: '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="m16 9l-5.5 5.5L8 12"/>',
  text: '<path d="M12 4v16M4 7V5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2M9 20h6"/>',
};

const url = (body: string) =>
  `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`)}")`;

/**
 * The properties as rows, like the property rows of a Notion page: an icon and a muted label, then the value. On a
 * narrow page the label sits above its value. Status reads as a pill, lists as small badges in the style of shadcn/ui's
 * Badge, on the shared `--comark-*` tokens. The rules sit in the `comark` layer, so any unlayered rule of the host's wins.
 */
export const css = `@layer comark{${[
  theme(".cfm"),
  ".cfm{container:cfm/inline-size;display:grid;gap:.125rem;margin:0 0 1.5rem;padding:0 0 .75rem;border-bottom:1px solid var(--_comark-border);color:var(--_comark-foreground);font:400 .875rem/1.5rem var(--_comark-font)}",
  ".cfm>div{display:grid;grid-template-columns:minmax(0,9rem) minmax(0,1fr);gap:.5rem;align-items:start}",
  ".cfm :is(dt,dd){margin:0;padding:0}",
  ".cfm dt{overflow:hidden;color:var(--_comark-muted);font-size:.8125rem;line-height:2rem;white-space:nowrap;text-overflow:ellipsis}",
  `.cfm dt::before{content:"";display:inline-block;width:1rem;height:1rem;margin-right:.5rem;vertical-align:-.1875rem;background:currentColor;opacity:.7;forced-color-adjust:none;-webkit-mask:var(--cfm-icon,${url(icons.text)}) center/contain no-repeat;mask:var(--cfm-icon,${url(icons.text)}) center/contain no-repeat}`,
  ...Object.entries(icons)
    .filter(([kind]) => kind !== "text")
    .map(([kind, body]) => `.cfm>[data-kind=${kind}]{--cfm-icon:${url(body)}}`),
  ".cfm dd{display:flex;flex-wrap:wrap;align-items:center;gap:.375rem;min-width:0;min-height:2rem;padding:.25rem 0;overflow-wrap:anywhere}",
  ".cfm time{font-variant-numeric:tabular-nums}",
  ".cfm a{color:inherit;text-decoration-color:var(--_comark-border);text-underline-offset:4px}",
  ".cfm a:hover{text-decoration-color:currentColor}",
  ".cfm a:focus-visible{border-radius:calc(var(--_comark-radius)/4);outline:2px solid var(--_comark-ring);outline-offset:2px;box-shadow:0 0 0 3px color-mix(in srgb,var(--_comark-ring) 50%,transparent)}",
  ".cfm-tag,.cfm-status{display:inline-flex;align-items:center;padding:0 .5rem;border:1px solid var(--_comark-border);font-size:.75rem;font-weight:500;line-height:1.25rem}",
  ".cfm-tag{border-radius:calc(var(--_comark-radius) - 2px);background:var(--_comark-accent)}",
  ".cfm-status{gap:.375rem;border-radius:999px}",
  '.cfm-status::before{content:"";width:.375rem;height:.375rem;border-radius:50%;background:var(--_comark-muted)}',
  "@container cfm (max-width:22rem){.cfm>div{grid-template-columns:minmax(0,1fr);gap:0}.cfm dt{line-height:1.75rem}.cfm dd{min-height:0;padding:0 0 .25rem}}",
  "@media print{.cfm{break-inside:avoid}}",
].join("")}}`;
