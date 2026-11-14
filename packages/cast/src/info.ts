import type { ComponentInfo } from "../../../shared/component-info.ts";

/** What an editor shows for `::cast`. */
export const componentInfo = {
  cast: {
    kind: "block",
    label: "Terminal output",
    description:
      "What a terminal printed in an asciinema recording, as colored text, from a file or the code block inside it.",
    props: {
      src: { type: "string", description: "A local cast file, relative to the plugin's root." },
      mode: {
        type: "string",
        options: ["screen", "log"],
        default: "screen",
        description: "screen shows the last screen; log shows every line printed.",
      },
      title: { type: "string", description: "A caption above the terminal." },
    },
  },
} satisfies Record<string, ComponentInfo>;
