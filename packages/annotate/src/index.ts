import { defineComarkPlugin } from "comark";
import { check } from "./read.ts";

export type { Mark } from "./marks.ts";
export { readMark } from "./read.ts";
export type { Annotation, Issue } from "./read.ts";

export type AnnotateOptions = {
  /**
   * Measure screenshots without a viewport at render time. By default only data URIs are measured. `true` also
   * fetches remote URLs, including redirects, so enable it only for trusted documents. `false` disables measurement.
   */
  size?: boolean;
};

export type AnnotateMeta = {
  /** Host sizing option carried to the HTML renderer. An authored viewport always takes precedence. */
  annotateSize?: boolean;
  /** One readable sentence per problem, naming its block and the fix. Empty when the document is valid. Other plugins add theirs too. */
  issues: string[];
  /** The comark-linter rule of each issue, by its sentence, so the linter reports it under its own code. */
  issueRules: Record<string, string>;
};

/**
 * Checks `::screenshot`, `::compare`, and `::annotation` blocks while parsing and adds every problem to
 * `meta.issues`, so a host can reject a document before publishing it. Also passes the host's sizing option to HTML.
 */
export default defineComarkPlugin<AnnotateOptions, AnnotateMeta>((options) => ({
  name: "comark-annotate",
  post(state) {
    const { tree } = state;
    tree.meta.annotateSize = options?.size;
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
