import { css } from "./styles.ts";

/** Adds the test results styles to the page once. The Vue, React, and Svelte components call it when they mount. */
export function addStyles(): void {
  if (document.querySelector("style[data-comark-tests]")) return;
  const style = document.createElement("style");
  style.dataset.comarkTests = "";
  style.textContent = css;
  document.head.append(style);
}

/** The words of the summary line, in order: a count when it has something to say, then the duration. */
export function summary({
  passed = 0,
  failed = 0,
  skipped = 0,
}: {
  passed?: number;
  failed?: number;
  skipped?: number;
}): { kind: "passed" | "failed" | "skipped"; text: string }[] {
  return [
    { kind: "passed" as const, text: `${passed} passed` },
    ...(failed ? [{ kind: "failed" as const, text: `${failed} failed` }] : []),
    ...(skipped ? [{ kind: "skipped" as const, text: `${skipped} skipped` }] : []),
  ];
}

export { css };
