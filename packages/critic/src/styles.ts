import { dark, theme } from "comark-zoom/theme";

const marks = ".ccm-ins,.ccm-del,.ccm-mark";
// Lucide's message-square, drawn as a mask in the comment's color.
const bubble = `url("data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
)}")`;

/**
 * Styles for the marks, on the shared `--comark-*` tokens: an insertion tinted green over a line, a deletion struck
 * through in red (shadcn/ui's `--destructive` when the page has it), a highlight in amber, and a comment as a muted note with a
 * speech bubble beside the text it's about. Override `--ccm-ins`, `--ccm-del`, and `--ccm-mark`. The rules sit in the `comark`
 * layer, so any unlayered rule of the host's wins.
 */
export const css = `@layer comark{${[
  theme(`${marks},.ccm-comment`, "status"),
  // Resolved into private variables, so a `--ccm-*` set on `:root` or any ancestor reaches the marks.
  `:where(${marks}){--_ccm-ins:var(--ccm-ins,var(--_comark-success));--_ccm-del:var(--ccm-del,var(--_comark-danger));--_ccm-mark:var(--ccm-mark,#f5b400)}`,
  dark(`:where(${marks})`, "--_ccm-mark:var(--ccm-mark,#f5c84b)"),
  // A mark that wraps keeps its tint and corners on every line.
  `${marks},.ccm-comment{border-radius:calc(var(--_comark-radius) - 6px);-webkit-box-decoration-break:clone;box-decoration-break:clone}`,
  `${marks}{padding:0 .125em;color:inherit}`,
  // The line under an insertion says what the green does, for a reader who can't tell it from the text.
  ".ccm-ins{background:color-mix(in srgb,var(--_ccm-ins) 14%,transparent);box-shadow:inset 0 -1.5px color-mix(in srgb,var(--_ccm-ins) 60%,transparent);text-decoration:none}",
  ".ccm-del{background:color-mix(in srgb,var(--_ccm-del) 10%,transparent);color:color-mix(in oklab,var(--_ccm-del) 60%,var(--_comark-foreground));text-decoration:line-through;text-decoration-color:color-mix(in srgb,var(--_ccm-del) 70%,transparent)}",
  ".ccm-mark{background:color-mix(in srgb,var(--_ccm-mark) 30%,transparent)}",
  // No edge, which would make it inline code, and a speech bubble that says it's a note on the text, not part of it.
  ".ccm-comment{margin:0 .125em;padding:.0625em .375em;background:var(--_comark-accent);color:var(--_comark-muted);font-size:.8125em;font-style:normal}",
  `.ccm-comment::before{content:'';display:inline-block;width:1em;height:1em;margin-right:.3125em;background:currentColor;mask:${bubble} center/contain no-repeat;vertical-align:-.15em}`,
].join("")}}`;
