import type { RuleInfo } from "./types.ts";

// comark-metrics's issues, COMARK1601 on.
export default {
  "comark/metrics/invalid-better": {
    code: "COMARK1601",
    title: "Write `better` as `lower` or `higher`",
  },
  "comark/metrics/missing-number": {
    code: "COMARK1602",
    title: "Give `:delta` its `from` and `to`, and `:progress` its `value`",
  },
  "comark/metrics/invalid-number": {
    code: "COMARK1603",
    title: "Write `from`, `to`, and `value` as bare numbers",
  },
  "comark/metrics/invalid-max": { code: "COMARK1604", title: "Write `max` as a number above 0" },
  "comark/metrics/value-out-of-range": {
    code: "COMARK1605",
    title: "Keep a `:progress` `value` between 0 and `max`",
  },
  "comark/metrics/missing-table": { code: "COMARK1606", title: "Put a table inside `::stats`" },
  "comark/metrics/content-dropped": {
    code: "COMARK1607",
    title: "Keep everything but the table out of `::stats`",
  },
  "comark/metrics/column-count": {
    code: "COMARK1608",
    title: "Give a `::stats` table three columns, or two with `tiles`",
  },
  "comark/metrics/non-numeric-cell": {
    code: "COMARK1609",
    title: "Write a `::stats` row's before and after as numbers",
  },
  "comark/metrics/unit-mismatch": {
    code: "COMARK1610",
    title: "Write a `::stats` row's before and after in one unit",
  },
  "comark/metrics/unknown-prop": {
    code: "COMARK1611",
    title: "Use only the props of `:delta`, `:progress`, and `::stats`",
  },
} satisfies Record<`comark/metrics/${string}`, RuleInfo>;
