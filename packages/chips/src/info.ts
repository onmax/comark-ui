import type { ComponentInfo } from "../../../shared/component-info.ts";

/** What an editor shows for `:chip`. */
export const componentInfo = {
  chip: {
    kind: "inline",
    label: "Chip",
    description: "Text as a link chip with its site's favicon or an avatar.",
    props: {
      href: { type: "string", description: "The chip's web address. Required." },
      avatar: {
        type: "string",
        description:
          "A round image instead of the favicon: an image URL, @user for GitHub, or provider:name.",
      },
      title: { type: "string", description: "The tooltip." },
    },
  },
} satisfies Record<string, ComponentInfo>;
