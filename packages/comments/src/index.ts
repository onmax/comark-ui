import { defineComarkPlugin } from "comark";
import { defer, hasRenderBindings, hash, type Mark, transform } from "./read.ts";

export type { Entry, Mark } from "./read.ts";

export type CommentsOptions = {
  /**
   * How suggestions draw unless one sets its own `mark`: `track`, a red strike and a green insert, or `pen`, a
   * hand-drawn strike with the new words handwritten above. Pen falls back to track for a change longer than 24
   * characters, across lines, or with code or links. Default `track`.
   */
  mark?: Mark;
  /**
   * An image per author, by the name written in `by` without `@`, such as `{ onmax: "https://github.com/onmax.png" }`.
   * Names match in any case. An author without one gets an initial on a color from the name.
   */
  avatars?: Record<string, string>;
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
  const avatars = Object.fromEntries(
    Object.entries(options.avatars ?? {}).map(([name, src]) => [
      name.replace(/^@/, "").toLowerCase(),
      src,
    ]),
  );
  return {
    name: "comark-comments",
    post(state) {
      const { tree } = state;
      const settings = {
        mark,
        avatars,
        prefix: `cr-${hash(state.markdown)}`,
        data: { frontmatter: tree.frontmatter, meta: tree.meta, data: {}, props: {} },
        parsing: true,
      };
      // Diagnose static authoring errors now, but keep the authored tree for render-time bindings.
      const deferred = hasRenderBindings(tree.nodes);
      const found = transform(deferred ? structuredClone(tree.nodes) : tree.nodes, settings);
      if (deferred) tree.nodes = [defer(tree.nodes, settings)];
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
