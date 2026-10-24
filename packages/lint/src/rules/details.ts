import type { RuleInfo } from "./types.ts";

// comark-details's issues, COMARK2701 on. Its icons' problems are comark-icon's rules.
export default {
  "comark/details/missing-summary": {
    code: "COMARK2701",
    title: "Give every `::details` a summary",
  },
  "comark/details/content-outside-item": {
    code: "COMARK2702",
    title: "Put everything in `::accordion` inside an `:::accordion-item`",
  },
  "comark/details/empty-accordion": {
    code: "COMARK2703",
    title: "Give every `::accordion` an item",
  },
  "comark/details/missing-label": { code: "COMARK2704", title: "Label every accordion item" },
  "comark/details/invalid-default-value": {
    code: "COMARK2705",
    title: "Open accordion items by their position from 0",
  },
  "comark/details/invalid-type": {
    code: "COMARK2706",
    title: "Write an accordion's `type` as `single` or `multiple`",
  },
  "comark/details/stray-accordion-item": {
    code: "COMARK2707",
    title: "Keep `:::accordion-item` inside `::accordion`",
  },
  "comark/details/empty-collapsible": {
    code: "COMARK2708",
    title: "Put content in every `::collapsible`",
  },
  "comark/details/unknown-prop": {
    code: "COMARK2709",
    title: "Use only the props of `::details`, `::accordion`, and `::collapsible`",
  },
} satisfies Record<`comark/details/${string}`, RuleInfo>;
