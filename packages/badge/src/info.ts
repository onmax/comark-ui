import type { ComponentInfo } from "../../../shared/component-info.ts";

/** What an editor shows for `:badge`. */
export const componentInfo = {
  badge: {
    kind: "inline",
    label: "Badge",
    description:
      "A small tinted label for a version or a status, or a label and value image with source.",
    props: {
      color: {
        type: "string",
        default: "primary",
        description:
          "primary, secondary, success, info, warning, error, or neutral. Images also take a hex color.",
      },
      source: {
        type: "string",
        options: ["static", "npm-version", "npm-downloads", "github-actions"],
        default: "static",
        description: "Draws the badge as an image.",
      },
      label: { type: "string", description: "An image's left-hand text, up to 80 characters." },
      value: {
        type: "string",
        description: "A static image's text, up to 80 characters. Without it, the bracket text.",
      },
      package: { type: "string", description: "The npm package, for npm sources." },
      period: {
        type: "string",
        options: ["day", "week", "month"],
        default: "month",
        description: "The downloads' window.",
      },
      repository: {
        type: "string",
        description: "A public GitHub repository as owner/repo, for GitHub Actions.",
      },
      workflow: { type: "string", description: "The workflow's file name, such as ci.yml." },
      branch: { type: "string", description: "The branch whose workflow runs count." },
      icon: {
        type: "string",
        options: ["none", "package", "npm", "npmx", "nuxt", "github", "comark", "shadcn", "check"],
        description: "An image's icon. Without it, the source's.",
      },
      labelColor: {
        type: "string",
        default: "neutral",
        description: "A color name or hex color behind the label, in the subtle and solid styles.",
      },
      preset: {
        type: "string",
        options: ["default", "npmx", "nuxt", "flat", "for-the-badge"],
        default: "default",
      },
      style: {
        type: "string",
        options: ["shadcn", "subtle", "solid"],
        default: "shadcn",
        description: "The image's look in the default preset.",
      },
      theme: {
        type: "string",
        options: ["auto", "light", "dark"],
        default: "auto",
        description: "auto follows the page's light or dark theme.",
      },
    },
  },
} satisfies Record<string, ComponentInfo>;
