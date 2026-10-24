import type { RuleInfo } from "./types.ts";

// comark-annotate's issues, COMARK0101 on.
export default {
  "comark/annotate/unknown-prop": {
    code: "COMARK0101",
    title: "Use only the props of `::screenshot`, `::compare`, and `::annotation`",
  },
  "comark/annotate/undefined-binding": {
    code: "COMARK0102",
    title: "Bind props to data that exists",
  },
  "comark/annotate/unsafe-bound-url": {
    code: "COMARK0103",
    title: "Bind `src` and `href` to http:// or https:// URLs",
  },
  "comark/annotate/missing-src": { code: "COMARK0104", title: "Give every `::screenshot` a `src`" },
  "comark/annotate/missing-alt": {
    code: "COMARK0105",
    title: "Describe every `::screenshot` in its `alt`",
  },
  "comark/annotate/invalid-href": {
    code: "COMARK0106",
    title: "Link a screenshot to the http:// or https:// page it captured",
  },
  "comark/annotate/invalid-viewport": {
    code: "COMARK0107",
    title: "Write `viewport` as the capture size, like `1440x900`",
  },
  "comark/annotate/invalid-position": {
    code: "COMARK0108",
    title: "Place each annotation with `x`, `y`, `w`, `h`, `at`, and `to` from 0 to 100",
  },
  "comark/annotate/box-outside-image": {
    code: "COMARK0109",
    title: "Keep each annotation's box inside the image",
  },
  "comark/annotate/box-as-fraction": {
    code: "COMARK0110",
    title: "Write `x`, `y`, `w`, and `h` as percentages, not fractions",
  },
  "comark/annotate/unknown-mark": { code: "COMARK0111", title: "Use a mark annotate draws" },
  "comark/annotate/invalid-color": {
    code: "COMARK0112",
    title: "Color a mark or a figure's `ink` with a named color or a hex color",
  },
  "comark/annotate/invalid-side": {
    code: "COMARK0113",
    title: "Set `side` to `left`, `right`, `top`, or `bottom`",
  },
  "comark/annotate/invisible-mark": {
    code: "COMARK0114",
    title: 'Give an annotation with `mark="none"` a `side`',
  },
  "comark/annotate/missing-note": {
    code: "COMARK0115",
    title: "Write a note in every `::annotation`",
  },
  "comark/annotate/nested-block": {
    code: "COMARK0116",
    title: "Keep screenshots, compares, and annotations out of notes and captions",
  },
  "comark/annotate/side-notes-overlap": {
    code: "COMARK0117",
    title: "Leave room between side notes on one side",
  },
  "comark/annotate/numbers-overlap": {
    code: "COMARK0118",
    title: "Leave room for each annotation's number",
  },
  "comark/annotate/too-many-annotations": {
    code: "COMARK0119",
    title: "Keep a screenshot or compare to 40 annotations",
  },
  "comark/annotate/annotation-outside-screenshot": {
    code: "COMARK0120",
    title: "Put every `::annotation` inside a `::screenshot`",
  },
  "comark/annotate/compare-content": {
    code: "COMARK0121",
    title: "Put only screenshots inside a `::compare`",
  },
  "comark/annotate/compare-screenshot-count": {
    code: "COMARK0122",
    title: "Give every `::compare` two screenshots, before and after",
  },
  "comark/annotate/compare-viewport-mismatch": {
    code: "COMARK0123",
    title: "Capture both sides of a `::compare` at one viewport",
  },
  "comark/annotate/compare-same-image": {
    code: "COMARK0124",
    title: "Show two different images in a `::compare`",
  },
  "comark/annotate/invalid-mode": {
    code: "COMARK0125",
    title: "Set a compare's `mode` to `columns` or `slider`",
  },
  "comark/annotate/needs-side": {
    code: "COMARK0126",
    title: "Give an annotation with `at` or `to` a `side`",
  },
} satisfies Record<`comark/annotate/${string}`, RuleInfo>;
