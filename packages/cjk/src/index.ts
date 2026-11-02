import { defineComarkPlugin } from "comark";
import cjkFriendly from "markdown-it-cjk-friendly";

type MarkdownIt = Parameters<typeof cjkFriendly>[0];
type CjkParser = {
  inline: {
    State: new (
      ...args: never[]
    ) => Pick<InstanceType<MarkdownIt["inline"]["State"]>, "src" | "posMax" | "scanDelims">;
  };
  utils: Pick<MarkdownIt["utils"], "isWhiteSpace" | "isMdAsciiPunct" | "isPunctChar">;
};

// SAFETY: the plugin only subclasses inline.State and uses these punctuation helpers.
// Both markdown-it and markdown-exit satisfy this shared interface; their rule registries differ.
const installCjkFriendly = cjkFriendly as (md: CjkParser) => void;

/**
 * Emphasis next to Chinese, Japanese, and Korean punctuation: `**この文は太字。**次の文` bolds, where CommonMark
 * leaves the asterisks as text. It runs markdown-it-cjk-friendly unchanged, so Latin text parses as before.
 */
export default defineComarkPlugin(() => ({
  name: "comark-cjk",
  markdownItPlugins: [installCjkFriendly],
}));
