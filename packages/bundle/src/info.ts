import type { ComponentInfo } from "../../../shared/component-info.ts";

/** What an editor shows for `::bundle`. */
export const componentInfo = {
  bundle: {
    kind: "block",
    label: "Bundle size",
    description:
      "What every page loads in two builds of an app, and the packages one added or dropped.",
    props: {
      before: {
        type: "string",
        description: "The build to compare from: its output folder, such as dist.",
      },
      after: { type: "string", description: "The build to compare to: its output folder." },
      src: {
        type: "string",
        description: "One build to show without a comparison, in place of before and after.",
      },
      title: {
        type: "string",
        default: "Bundle size",
        description: "Shown in the header, and names the figure.",
      },
    },
  },
} satisfies Record<string, ComponentInfo>;
