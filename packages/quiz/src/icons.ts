// Lucide's circle-check, circle-x, lightbulb, and check (ISC), stroked at 1.75 in currentColor.
const icon = (name: string, body: string) =>
  `<svg class="cqz-icon cqz-${name}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

export const icons = {
  yes: icon("yes", '<circle cx="12" cy="12" r="10"/><path d="m16 9-5.5 5.5L8 12"/>'),
  no: icon("no", '<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6m0-6 6 6"/>'),
  hint: icon(
    "bulb",
    '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5M9 18h6m-5 4h4"/>',
  ),
  check: icon("check", '<path d="M20 6 9 17l-5-5"/>'),
};

// The control's own marks: the selected radio's dot and the checked box's tick. Filled, since they show a selection.
export const marks = {
  radio:
    '<svg class="cqz-mark" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="4" fill="currentColor"/></svg>',
  checkbox:
    '<svg class="cqz-mark" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12.5 5-6 6L4 8.5"/></svg>',
};

export type Icons = typeof icons;
