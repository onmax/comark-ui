import type { ElementNode, Node } from "comark";
import { defineComarkPlugin } from "comark";
import { type GitHubMeta, report } from "./meta.ts";

export interface ReferencesOptions {
  /** The repository a bare `#123` points into, as `owner/name`. Without it, `#123` stays text. */
  repo?: string;
}

// Text that is already a link, or is code, keeps its characters.
const SKIP = new Set(["a", "code", "pre", "script", "style"]);
const REPO = /^[a-z\d-]+\/[\w.-]+$/i;
// `owner/name#123`, `#123`, or `@user`, not inside a word, a path, or an email address. A name followed by a slash
// is an npm scope such as `@comark/html`, so it isn't a mention.
const REFERENCE =
  /(?<![\w/.@#-])(?:([a-z\d-]+\/[\w.-]+)?#(\d+)|@([a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}))(?![\w/-])/gi;

const isElement = (node: Node | undefined): node is ElementNode =>
  Array.isArray(node) && node[0] !== null;

function link(text: string, repo: string | undefined): Node[] {
  const nodes: Node[] = [];
  let last = 0;
  for (const match of text.matchAll(REFERENCE)) {
    const [whole, owner, number, user] = match;
    const target = owner ?? repo;
    const href = user
      ? `https://github.com/${user}`
      : target && `https://github.com/${target}/issues/${number}`;
    if (!href) continue;
    if (match.index > last) nodes.push(text.slice(last, match.index));
    nodes.push(["a", { href }, whole]);
    last = match.index + whole.length;
  }
  if (!last) return [text];
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

function walk(nodes: Node[], start: number, repo: string | undefined) {
  for (let index = nodes.length - 1; index >= start; index--) {
    const node = nodes[index];
    if (!Array.isArray(node)) {
      nodes.splice(index, 1, ...link(node, repo));
      continue;
    }
    if (!isElement(node) || SKIP.has(node[0])) continue;
    // SAFETY: an element node is [tag, attributes, ...children], so its children start at index 2.
    walk(node as Node[], 2, repo);
  }
}

/**
 * GitHub's references as links: `@user` to the profile, and `#123` or `owner/name#123` to the issue or pull request.
 * Text in links and code stays as written.
 */
export const references = /* @__PURE__ */ defineComarkPlugin<ReferencesOptions, GitHubMeta>(
  (options) => ({
    name: "comark-github-references",
    post(state) {
      const { tree } = state;
      const repo = options?.repo;
      const valid = repo === undefined || REPO.test(repo);
      if (!valid)
        report(tree.meta, [
          {
            rule: "comark/github/invalid-repo",
            message: `references: \`repo\` must be owner/name, such as "onmax/comark-ui", not "${repo}"; until then #123 stays text.`,
          },
        ]);
      walk(tree.nodes, 0, valid ? repo : undefined);
    },
  }),
);
