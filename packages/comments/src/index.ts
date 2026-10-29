import { defineComarkPlugin } from "comark";
import { hash, type Mark, transform } from "./read.ts";

export type { Entry, Mark } from "./read.ts";

export type CommentsOptions = {
  /**
   * How suggestions draw unless one sets its own `mark`: `track`, a red strike and a green insert, or `pen`, a
   * hand-drawn strike with the new words handwritten above. Pen falls back to track for a change longer than 24
   * characters, across lines, or with code or links. Default `track`.
   */
  mark?: Mark;
};

export type CommentsMeta = {
  /** One readable sentence per problem with a `:suggestion` or `:comment`. Other plugins add theirs too. */
  issues: string[];
  /** The comark-linter rule of each issue, by its sentence, so the linter reports it under its own code. */
  issueRules: Record<string, string>;
};

/**
 * Reads `:suggestion` and `:comment`: suggested edits and comments on a span, each with an optional note in a card in
 * the margin. A `:comment{reply="id"}` anywhere in the document joins that thread. Problems are added to
 * `meta.issues`.
 */
export default defineComarkPlugin<CommentsOptions, CommentsMeta>((options = {}) => {
  const mark: Mark = options.mark === "pen" ? "pen" : "track";
  return {
    name: "comark-comments",
    post(state) {
      const { tree } = state;
      const found = transform(tree.nodes, { mark, prefix: `cr-${hash(state.markdown)}` });
      if (!found.length) return;
      // Several plugins report into the same list, so each one appends.
      tree.meta.issues = [...(tree.meta.issues ?? []), ...found.map((issue) => issue.message)];
      tree.meta.issueRules = {
        ...tree.meta.issueRules,
        ...Object.fromEntries(found.map((issue) => [issue.message, issue.rule])),
      };
    },
  };
});
