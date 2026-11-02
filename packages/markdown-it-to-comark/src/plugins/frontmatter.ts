import { parseFrontmatter, type ComarkPlugin } from "comark";

// `---` YAML (possibly empty), a fence with a language such as Eleventy's `---js`, or `+++` TOML.
const BLOCK =
  /^(?:---([a-z]*)[ \t]*\r?\n(?:([\s\S]*?)\r?\n)?---|\+\+\+[ \t]*\r?\n(?:([\s\S]*?)\r?\n)?\+\+\+)[ \t]*(?:\r?\n|$)/;

/**
 * Comark's frontmatter, except that YAML it can't read is dropped with an issue instead of failing the whole document.
 * Sites built on markdown-it strip frontmatter themselves, often with laxer parsers, so their files can hold either.
 */
export const frontmatter = (): ComarkPlugin => ({
  name: "frontmatter",
  pre(state) {
    // Frontmatter parsers match after a byte order mark, which editors on Windows often write; without frontmatter,
    // markdown-it keeps the mark as text, so it stays.
    const bom = state.markdown.charCodeAt(0) === 0xfeff ? 1 : 0;
    const block = BLOCK.exec(state.markdown.slice(bom));
    if (!block) return;
    state.markdown = state.markdown.slice(bom);
    // Only YAML is parsed; TOML and language fences are dropped, as the sites that strip them do.
    if (state.markdown.startsWith("---") && !block[1] && block[2]?.trim()) {
      try {
        const { content, data, frontmatterText } = parseFrontmatter(state.markdown);
        state.markdown = content;
        state.frontmatter = data;
        state.frontmatterText = frontmatterText;
        return;
      } catch (error) {
        state.frontmatterIssue = `The frontmatter isn't valid YAML (${error instanceof Error ? error.message.split("\n")[0] : String(error)}), so it was dropped; quote the value that holds the colon or brace.`;
      }
    }
    state.frontmatterText = block[2] ?? block[3] ?? "";
    state.markdown = state.markdown.slice(block[0].length);
  },
  post(state) {
    const issue: string | undefined = state.frontmatterIssue;
    if (!issue) return;
    const issues: string[] = (state.tree.meta.issues ??= []);
    issues.push(issue);
    state.tree.meta.issueRules = {
      ...state.tree.meta.issueRules,
      [issue]: "comark/invalid-frontmatter",
    };
  },
});
