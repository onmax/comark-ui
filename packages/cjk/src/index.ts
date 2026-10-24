import { defineComarkPlugin } from "comark";
import cjkFriendly from "markdown-it-cjk-friendly";

/**
 * Emphasis next to Chinese, Japanese, and Korean punctuation: `**この文は太字。**次の文` bolds, where CommonMark
 * leaves the asterisks as text. It runs markdown-it-cjk-friendly unchanged, so Latin text parses as before.
 */
export default defineComarkPlugin(() => ({
  name: "comark-cjk",
  markdownItPlugins: [cjkFriendly],
}));
