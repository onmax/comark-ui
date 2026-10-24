export type GitHubMeta = {
  /** One readable sentence per problem with a callout or the `references` options. Other plugins add theirs too. */
  issues: string[];
  /** The comark-linter rule of each issue, by its sentence, so the linter reports it under its own code. */
  issueRules: Record<string, string>;
};

export type Issue = { rule: `comark/github/${string}`; message: string };

export function report(meta: Partial<GitHubMeta>, issues: Issue[]) {
  meta.issues = [...(meta.issues ?? []), ...issues.map((issue) => issue.message)];
  meta.issueRules = {
    ...meta.issueRules,
    ...Object.fromEntries(issues.map((issue) => [issue.message, issue.rule])),
  };
}
