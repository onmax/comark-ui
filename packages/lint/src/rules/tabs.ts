import type { RuleInfo } from "./types.ts";

// comark-tabs's issues, COMARK1301 on. Its icons' problems are comark-icon's rules.
export default {
  "comark/tabs/content-outside-tab": {
    code: "COMARK1301",
    title: "Put everything in `::tabs` inside a `:::tabs-item`",
  },
  "comark/tabs/content-in-code-group": {
    code: "COMARK1302",
    title: "Put only code blocks in `::code-group`",
  },
  "comark/tabs/empty-tabs": { code: "COMARK1303", title: "Give every `::tabs` a tab" },
  "comark/tabs/missing-label": { code: "COMARK1304", title: "Label every tab" },
  "comark/tabs/duplicate-label": {
    code: "COMARK1305",
    title: "Give each tab in a block its own label",
  },
  "comark/tabs/stray-tabs-item": {
    code: "COMARK1306",
    title: "Keep `:::tabs-item` inside `::tabs`",
  },
  "comark/tabs/unknown-prop": {
    code: "COMARK1307",
    title: "Use only the props of `::tabs` and `:::tabs-item`",
  },
  "comark/tabs/no-manager-form": {
    code: "COMARK1308",
    title: "Write `npm2yarn` commands every package manager has",
  },
  "comark/tabs/no-npm-command": {
    code: "COMARK1309",
    title: "Write an `npm2yarn` block in npm commands",
  },
} satisfies Record<`comark/tabs/${string}`, RuleInfo>;
