/**
 * Rules for the layout a block takes once its script runs, with `&` standing for the block's root. They apply under
 * `html[ready]`, which the script sets when it starts, and, while the page runs scripts, inside a root that a Vue,
 * React, or Svelte component rendered with `data-comark-mounts`. That component starts the script when it mounts, so
 * a server render already paints the layout it will keep, and nothing jumps when the app hydrates. The HTML renderer's
 * output waits for its own script, so a reader that never runs it, such as a mail client or a strict CSP, keeps the
 * layout that reads without one.
 */
export function scripted(ready: string, root: string, rules: string[]): string {
  const under = (scope: string) => rules.map((rule) => rule.replaceAll("&", scope)).join("");
  return `${under(`[${ready}] ${root}`)}@media (scripting:enabled){${under(`${root}[data-comark-mounts]`)}}`;
}
