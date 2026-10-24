import { defineComarkPlugin } from "comark";
import { check } from "./read.ts";

export type { Mark } from "./marks.ts";
export { readMark } from "./read.ts";
export type { Annotation, Issue } from "./read.ts";

export type AnnotateMeta = {
  /** One readable sentence per problem, naming its block and the fix. Empty when the document is valid. Other plugins add theirs too. */
  issues: string[];
  /** The comark-linter rule of each issue, by its sentence, so the linter reports it under its own code. */
  issueRules: Record<string, string>;
};

/**
 * Checks `::screenshot`, `::compare`, and `::annotation` blocks while parsing and adds every problem to
 * `meta.issues`, so a host can reject a document before publishing it. Rendering does not depend on it.
 */
export default defineComarkPlugin<void, AnnotateMeta>(() => ({
  name: "comark-annotate",
  post(state) {
    const { tree } = state;
    const found = check(tree.nodes, {
      frontmatter: tree.frontmatter,
      meta: tree.meta,
      data: {},
      props: {},
    });
    // Several plugins report into the same list, so each one appends.
    tree.meta.issues = [...(tree.meta.issues ?? []), ...found.map((issue) => issue.message)];
    tree.meta.issueRules = {
      ...tree.meta.issueRules,
      ...Object.fromEntries(found.map((issue) => [issue.message, issue.rule])),
    };
  },
}));
