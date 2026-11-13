import { escapeHtml } from "comark/utils";
import { theme } from "comark-zoom/theme";
import { rawText } from "../../../shared/text.ts";

/** What a host may say in the box. Each is plain text, or a function of how many problems the document has. */
export type IssuesOptions = {
  /** The summary line. Default "This document has a problem", or "This document has 3 problems". */
  title?: string | ((count: number) => string);
  /** A line under the title, such as how to fix them. Default "Fix it in the Markdown.", or "Fix them…". `""` drops it. */
  hint?: string | ((count: number) => string);
};

/**
 * The box's styles, on the shared `--comark-*` tokens: a card tinted with the danger color, which also paints the icon,
 * while the title and the list keep the text colors. It sits in the `comark` layer, so any plain rule of the host's wins.
 */
export const issuesCss = `@layer comark{${[
  theme(".cis", "status"),
  ".cis{box-sizing:border-box;margin:0 0 1.5rem;padding:.75rem 1rem;border:1px solid color-mix(in oklab,var(--_comark-danger) 28%,transparent);border-radius:var(--_comark-radius);background:color-mix(in oklab,var(--_comark-danger) 5%,var(--_comark-background));color:var(--_comark-foreground);font:400 .875rem/1.5 var(--_comark-font)}",
  ".cis>summary{display:flex;gap:.5rem;align-items:center;margin:-.25rem -.375rem;padding:.25rem .375rem;border-radius:calc(var(--_comark-radius) - 4px);font-weight:600;list-style:none;cursor:pointer;user-select:none}",
  ".cis>summary::-webkit-details-marker{display:none}",
  ".cis>summary:focus-visible{outline:2px solid var(--_comark-danger);outline-offset:1px}",
  ".cis svg{flex:none;width:1rem;height:1rem;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}",
  ".cis-icon{color:var(--_comark-danger)}",
  ".cis-fold{margin-left:auto;color:var(--_comark-muted)}",
  "@media (prefers-reduced-motion:no-preference){.cis-fold{transition:rotate .15s ease-out}}",
  ".cis:not([open]) .cis-fold{rotate:-90deg}",
  // The muted token alone falls under 4.5:1 on the tint; a fifth of the foreground lifts it past that in both schemes.
  ".cis-hint{margin:.25rem 0 0 1.5rem;color:color-mix(in oklab,var(--_comark-muted) 80%,var(--_comark-foreground));font-size:.8125rem}",
  ".cis-list{margin:.625rem 0 0;padding-left:1.5rem}",
  ".cis-list>li{margin:.375rem 0 0;padding-left:.125rem;text-wrap:pretty;overflow-wrap:anywhere}",
  ".cis-list>li::marker{color:var(--_comark-muted)}",
  ".cis code{padding:.125rem .25rem;border-radius:.25rem;background:color-mix(in oklab,var(--_comark-foreground) 7%,transparent);font:.8125rem ui-monospace,SFMono-Regular,Menlo,monospace}",
].join("")}}`;

/** The problems the plugins wrote to `meta.issues`, each a sentence. Anything there that isn't text is skipped. */
export function issuesOf(meta: { issues?: unknown } | undefined): string[] {
  const issues = meta?.issues;
  return Array.isArray(issues) ? issues.flatMap((issue) => rawText(issue) || []) : [];
}

// Lucide's triangle-alert and chevron-down (ISC).
const ICON =
  '<svg class="cis-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>';
const FOLD =
  '<svg class="cis-fold" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';

const say = (value: IssuesOptions["title"], count: number) =>
  value instanceof Function ? value(count) : value;

/**
 * Plugins quote Markdown in backticks, which reads as code here. "`::question` 2 has no id" counts blocks of a kind, so
 * the number gets a `#` to read as an ordinal rather than part of the sentence.
 */
const item = (issue: string) =>
  `<li>${escapeHtml(issue)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/^(<code>::[\w-]+<\/code>) (\d+) /, "$1 #$2 ")}</li>`;

/** The inside of the box, the same in every renderer: the summary, the hint, and one item per problem. */
export function issuesInner(issues: string[], options: IssuesOptions = {}): string {
  const count = issues.length;
  const title =
    say(options.title, count) ??
    (count === 1 ? "This document has a problem" : `This document has ${count} problems`);
  const hint = say(options.hint, count) ?? `Fix ${count === 1 ? "it" : "them"} in the Markdown.`;
  return (
    `<summary>${ICON}<span class="cis-title">${escapeHtml(title)}</span>${FOLD}</summary>` +
    (hint ? `<p class="cis-hint">${escapeHtml(hint)}</p>` : "") +
    `<ul class="cis-list">${issues.map(item).join("")}</ul>`
  );
}
