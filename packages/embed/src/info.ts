import type { ComponentInfo } from "../../../shared/component-info.ts";

/** What an editor shows for `::embed`. */
export const componentInfo = {
  embed: {
    kind: "block",
    label: "Embed",
    description: "A video or app player from its link, or a card for any other https:// page.",
    props: {
      url: { type: "string", description: "An https:// link to a player or any page. Required." },
      title: { type: "string", description: "Names the player, and is the card's title." },
      start: {
        type: "number",
        description: "Whole seconds into a YouTube or Vimeo video to start at.",
      },
      height: {
        type: "number",
        description: "Whole pixels. How tall a CodePen, StackBlitz, Figma, or app player is.",
      },
    },
  },
} satisfies Record<string, ComponentInfo>;
