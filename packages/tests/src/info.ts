import type { ComponentInfo } from "../../../shared/component-info.ts";

/** What an editor shows for `::tests`. */
export const componentInfo = {
  tests: {
    kind: "block",
    label: "Test results",
    description:
      "The passed, failed, and skipped counts of a JUnit report, with each failure's message and stack.",
    props: {
      src: {
        type: "string",
        description:
          "The JUnit XML file to read. Without it, the block reads the xml fence inside.",
      },
      title: {
        type: "string",
        description: "Shown before the counts, and names the results for screen readers.",
      },
    },
  },
} satisfies Record<string, ComponentInfo>;
