import type { ComponentInfo } from "../../../shared/component-info.ts";

/** What an editor shows for `::git-graph`. */
export const componentInfo = {
  "git-graph": {
    kind: "block",
    label: "Git graph",
    description:
      "A commit graph with branches, merges, and tags, from the git log output in the fenced block inside it.",
    props: {
      title: {
        type: "string",
        description: "Shown in the header, and names the figure for screen readers.",
      },
      reverse: { type: "boolean", description: "Shows the oldest commit first." },
      "max-count": {
        type: "number",
        description: "Keeps this many of the newest commits and folds the rest into one row.",
      },
    },
    slots: {
      title: "Markdown for the header, in place of the title prop.",
      footer: "Markdown under the graph, such as the next steps.",
    },
  },
} satisfies Record<string, ComponentInfo>;
