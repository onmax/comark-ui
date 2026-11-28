import type { ElementNode, Node } from "comark";
import { defineComarkPlugin } from "comark";
import { complete } from "./complete.ts";
import { drawPost, readPost, type Data, type Issue, type Look, type Post } from "./post.ts";
import { isElement } from "../../../shared/nodes.ts";

export { fetchPost, FetchPostError } from "./fetch.ts";
export type { FetchedMedia, FetchedPost, FetchPostOptions } from "./fetch.ts";
export { COUNTS, PLATFORMS, type Count, type Platform } from "./platforms.ts";

export type SocialMeta = {
  /** One readable sentence per problem with a post. Other plugins add theirs too. */
  issues: string[];
  /** The comark-linter rule of each issue, by its sentence, so the linter reports it under its own code. */
  issueRules: Record<string, string>;
};

export interface SocialOptions {
  /**
   * Fills each `::post{url}` on X, Bluesky, or Mastodon from the platform's public API while parsing, and inlines its
   * avatar and pictures, so the page asks no one for them. Written props win. Default `false`: a post shows only what's
   * written, and parsing makes no request.
   */
  fetch?: boolean;
  /** The largest picture, in bytes, a fetch inlines. A larger one keeps its address, with an issue. Default 500 KB. */
  maxImageSize?: number;
  /** A BCP 47 tag for dates and counts. Default `en-US`. */
  locale?: string;
  /** An IANA zone for the time of day. Defaults to the runtime's. */
  timeZone?: string;
  /** The moment a date's year is left out from, when it's the same. Defaults to the moment of parsing. */
  now?: Date | string | number;
}

/**
 * What a `::post` becomes. `platform` picks the logo and the icons, `label` names the card for screen readers, and
 * `quote` marks a quoted post inside another. Its children are plain elements: the header, the text, the pictures, the
 * quoted post, and the counts.
 */
export type PostAttributes = { platform?: string; label?: string; quote?: string };

/**
 * Turns each `::post` into a static card for X, Bluesky, Mastodon, Threads, LinkedIn, or any other site, with the
 * platform's logo and counts. A `:::post` inside is the quoted post. With `fetch`, a post with a `url` is filled from
 * the platform's public API while parsing. Problems are added to `meta.issues`.
 */
export default defineComarkPlugin<SocialOptions | void, SocialMeta>((options) => {
  const settings: SocialOptions = options ?? {};
  return {
    name: "comark-social",
    async post(state) {
      const { tree } = state;
      const data: Data = { frontmatter: tree.frontmatter, meta: tree.meta, data: {}, props: {} };
      const registered = (name: string) =>
        Boolean(state.options.plugins?.some((plugin) => plugin.name === name));
      const look: Look = {
        chips: registered("comark-chips"),
        references: registered("comark-github-references"),
        locale: settings.locale,
        timeZone: settings.timeZone,
        now: settings.now,
      };
      const issues: Issue[] = [];
      const found: { nodes: Node[]; index: number; post: Post }[] = [];
      let posts = 0;
      const walk = (nodes: Node[], start: number) => {
        for (let index = start; index < nodes.length; index++) {
          const node = nodes[index];
          if (!isElement(node)) continue;
          if (node[0] === "post") {
            const post = readPost(node, `\`::post\` ${++posts}`, data, issues);
            found.push({ nodes, index, post });
            continue;
          }
          // SAFETY: an element node is [tag, attributes, ...children], so its children start at index 2.
          walk(node as Node[], 2);
        }
      };
      walk(tree.nodes, 0);
      await Promise.all(
        found.map(async (item) => {
          const post = await complete(item.post, settings, issues);
          if (!post.author && !post.handle)
            issues.push({
              rule: "comark/social/missing-author",
              message: `${post.name} has no \`author\` or \`handle\`, so the card names no one. Write \`author\`, or give it a \`url\` and turn on the \`fetch\` option.`,
            });
          item.nodes[item.index] = drawPost(post, look) satisfies ElementNode;
        }),
      );
      // Fetches finish in any order, so the issues are sorted back into the order of the blocks.
      const order = (issue: Issue) => Number(/^`::post` (\d+)/.exec(issue.message)?.[1] ?? 0);
      issues.sort((a, b) => order(a) - order(b));
      tree.meta.issues = [...(tree.meta.issues ?? []), ...issues.map((issue) => issue.message)];
      tree.meta.issueRules = {
        ...tree.meta.issueRules,
        ...Object.fromEntries(issues.map((issue) => [issue.message, issue.rule])),
      };
    },
  };
});
