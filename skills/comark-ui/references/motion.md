# Motion

comark-motion runs ViteHub UI's motion layer in a document. It has no syntax: blocks get their motion from the roles they render, so a document never asks for motion.

## What moves

- A press on any button, link, or summary squashes it and springs it back.
- A tab strip's surface slides to the selected tab. A chevron of a disclosure turns.
- A tooltip, such as a date's, rises from behind its trigger. A zoomed picture travels from its place in the page and back.
- Under `prefers-reduced-motion`, nothing travels. `data-motion="none"` on the element the host renders into leaves everything still.

## Register

- In `comark-ui`: on in every entry. `motion: false` leaves the blocks still.
- Alone: `pnpm add comark comark-motion`, then `plugins: [motion()]` and `components` from `comark-motion/html`, `/vue`, `/react`, or `/svelte`.
