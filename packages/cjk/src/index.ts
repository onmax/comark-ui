import { defineComarkPlugin, type MarkdownExitPlugin } from "comark";
import cjkFriendly from "markdown-it-cjk-friendly";

/**
 * Emphasis next to Chinese, Japanese, and Korean punctuation: `**この文は太字。**次の文` bolds, where CommonMark
 * leaves the asterisks as text. It runs markdown-it-cjk-friendly unchanged, so Latin text parses as before.
 */
export default defineComarkPlugin(() => ({
  name: "comark-cjk",
  // SAFETY: the plugin only subclasses inline.State and uses utils' punctuation helpers, which markdown-exit keeps.
  markdownItPlugins: [cjkFriendly as unknown as MarkdownExitPlugin],
}));
