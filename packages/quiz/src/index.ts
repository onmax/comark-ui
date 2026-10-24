import { defineComarkPlugin } from "comark";
import type { QuizLabels } from "./labels.ts";
import { transform } from "./read.ts";

export { DEFAULT_LABELS } from "./labels.ts";
export type { QuizLabels } from "./labels.ts";

export type QuizOptions = {
  /** The words the blocks show, such as `{ check: "Comprobar" }`. Each one left out keeps its English default. */
  labels?: Partial<QuizLabels>;
};

export type QuizMeta = {
  /** One readable sentence per problem with a `::question`, `::poll`, or `::recall`. Empty when there are none. */
  issues: string[];
  /** The comark-linter rule of each issue, by its sentence, so the linter reports it under its own code. */
  issueRules: Record<string, string>;
};

/**
 * Reads `::question`, `::poll`, and `::recall` blocks: the prompt, the task-list options with their `>` rationales,
 * and the slots. Each option gets a key from its text, a question's options are shuffled the same way on every render,
 * and questions and recall cards are numbered in document order. Problems are added to `meta.issues`.
 */
export default defineComarkPlugin<QuizOptions, QuizMeta>((options = {}) => {
  const labels =
    options.labels && Object.keys(options.labels).length ? { ...options.labels } : undefined;
  return {
    name: "comark-quiz",
    post(state) {
      const { tree } = state;
      const found = transform(
        tree.nodes,
        { frontmatter: tree.frontmatter, meta: tree.meta, data: {}, props: {} },
        state.markdown,
        labels,
      );
      // Several plugins report into the same list, so each one appends.
      tree.meta.issues = [...(tree.meta.issues ?? []), ...found.map((issue) => issue.message)];
      tree.meta.issueRules = {
        ...tree.meta.issueRules,
        ...Object.fromEntries(found.map((issue) => [issue.message, issue.rule])),
      };
    },
  };
});
