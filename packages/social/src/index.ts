import type { ElementNode, Node } from "comark";
import { defineComarkPlugin } from "comark";
import { complete } from "./complete.ts";
import { drawConversation, readConversation } from "./conversation.ts";
import { drawPost, readPost, type Data, type Issue, type Look } from "./post.ts";
import type { SocialRequest } from "./request.ts";
import { completeThread, drawThread, readThread } from "./thread.ts";
import { isElement } from "../../../shared/nodes.ts";

export { fetchPost, FetchPostError } from "./fetch.ts";
export type { FetchedMedia, FetchedPost, FetchPostOptions } from "./fetch.ts";
export type { SocialRequest } from "./request.ts";
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
  /** Egress-enforcing transport for every API and image request, including redirects. Required for Mastodon. */
  request?: SocialRequest;
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
 * `quote` marks a quoted post inside another. In a `::thread`, `thread` marks each post, `focal` the last one, and
 * `rail` each post the rail runs on from. Its children are plain elements: the header, the text, the pictures, the
 * quoted post, and the counts.
 */
export type PostAttributes = {
  platform?: string;
  label?: string;
  quote?: string;
  thread?: string;
  focal?: string;
  rail?: string;
};

/**
 * What a `::thread` becomes: one card, named by `label`, with the platform's logo first and then its `post` nodes, the
 * earlier ones in a `details` when there are many.
 */
export type ThreadAttributes = { platform?: string; label?: string };

/**
 * What a `::conversation` becomes: one card, named by `label`, holding a header and an `ol` of messages. `request`
 * marks a message request.
 */
export type ConversationAttributes = { platform?: string; label?: string; request?: string };

/**
 * Turns each `::post` into a static card for X, Bluesky, Mastodon, Threads, LinkedIn, or any other site, with the
 * platform's logo and counts. A `:::post` inside is the quoted post. A `::thread` joins its `:::post` blocks by a rail;
 * a `::conversation` draws its `:::message` blocks as chat bubbles. With `fetch`, a post with a `url` is filled from
 * the platform's public API, and a `::thread{url}` with no posts walks up from that post. Problems go in `meta.issues`.
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
      // Each block keeps its own issues, so they stay in the order of the blocks however the fetches finish.
      const blocks: {
        nodes: Node[];
        index: number;
        issues: Issue[];
        draw: () => Promise<ElementNode | undefined>;
      }[] = [];
      const names = new Map<ElementNode, string>();
      let threads = 0;
      let conversations = 0;
      const walk = (nodes: Node[], start: number, insideSocial: boolean) => {
        for (let index = start; index < nodes.length; index++) {
          const node = nodes[index];
          if (!isElement(node)) continue;
          const issues: Issue[] = [];
          const tag = node[0];
          if (tag === "conversation") {
            const name = `\`::conversation\` ${++conversations}`;
            if (!insideSocial) {
              const chat = readConversation(node, name, data, look, issues);
              blocks.push({ nodes, index, issues, draw: async () => drawConversation(chat, look) });
            }
          }
          if (tag === "thread") {
            const name = `\`::thread\` ${++threads}`;
            if (!insideSocial) {
              const thread = readThread(node, name, data, issues);
              blocks.push({
                nodes,
                index,
                issues,
                draw: async () => drawThread(await completeThread(thread, settings, issues), look),
              });
            }
          }
          if (tag === "post") {
            names.set(node, `\`::post\` ${names.size + 1}`);
            // Read once the walk is done, since a quoted post inside takes its number from the walk too.
            if (!insideSocial)
              blocks.push({
                nodes,
                index,
                issues,
                draw: async () => {
                  const written = readPost(node, (post) => names.get(post)!, data, issues);
                  return drawPost(await complete(written, settings, issues), look);
                },
              });
          }
          // A thread's rows still count as posts, as the linter counts every `post` it finds, so the numbers match.
          // SAFETY: an element node is [tag, attributes, ...children], so its children start at index 2.
          walk(
            node as Node[],
            2,
            insideSocial || tag === "post" || tag === "conversation" || tag === "thread",
          );
        }
      };
      walk(tree.nodes, 0, false);
      const drawn = await Promise.all(blocks.map((block) => block.draw()));
      // From the last block back, so dropping an empty card does not move the blocks after it in the same list.
      for (let at = blocks.length - 1; at >= 0; at--) {
        const { nodes, index } = blocks[at]!;
        const node = drawn[at];
        if (node) nodes[index] = node;
        else nodes.splice(index, 1);
      }
      const issues = blocks.flatMap((block) => block.issues);
      tree.meta.issues = [...(tree.meta.issues ?? []), ...issues.map((issue) => issue.message)];
      tree.meta.issueRules = {
        ...tree.meta.issueRules,
        ...Object.fromEntries(issues.map((issue) => [issue.message, issue.rule])),
      };
    },
  };
});
