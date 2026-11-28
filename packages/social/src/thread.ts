import type { ElementNode, Node } from "comark";
import { complete, type CompleteOptions } from "./complete.ts";
import { fetchPost, type FetchedPost } from "./fetch.ts";
import { isPlatform, PLATFORM, platformOf, type Platform } from "./platforms.ts";
import {
  contentOf,
  drawPost,
  props,
  readPost,
  webUrl,
  type Data,
  type Issue,
  type Look,
  type Post,
} from "./post.ts";
import { isElement } from "../../../shared/nodes.ts";
import { errorText, text } from "../../../shared/text.ts";

/** A thread as it's drawn: its posts from the root to the focal one. */
export interface Thread {
  name: string;
  url?: string;
  /** Whether the last post is the focal one. */
  focal: boolean;
  posts: Post[];
}

const THREAD_PROPS = ["url", "focal"];
/** How many posts above the last one show before the rest fold, all but the one it replies to. */
export const FOLD = 5;
/** How many posts a fetch walks, the focal one included. */
export const WALK = 5;

/** Reads a written `::thread` and its `:::post` blocks. */
export function readThread(node: ElementNode, name: string, data: Data, issues: Issue[]): Thread {
  const attrs = props(node, name, "::thread", THREAD_PROPS, data, issues);
  const url = text(attrs.url);
  const address = url ? webUrl(url) : undefined;
  if (url && !address)
    issues.push({
      rule: "comark/social/invalid-url",
      message: `${name}: \`url\` is "${url}", which isn't an http or https address, so the thread isn't fetched. Write the last post's full address, such as https://x.com/jack/status/20.`,
    });
  const posts: Post[] = [];
  const stray: string[] = [];
  const context = shared(contentOf(node), address);
  for (const child of contentOf(node)) {
    if (isElement(child) && child[0] === "post") {
      const own = `${name}, post ${posts.length + 1}`;
      const nameOf = (post: ElementNode) => (post === child ? own : `${own}'s quoted post`);
      posts.push(readPost(child, nameOf, data, issues, undefined, context));
    } else if (isElement(child)) stray.push(child[0]);
    else if (typeof child === "string" && child.trim()) stray.push("text");
  }
  if (stray.length)
    issues.push({
      rule: "comark/social/thread-content",
      message: `${name} holds ${stray.length === 1 ? `a \`${stray[0]}\`` : `${stray.length} blocks`} outside its posts, and a thread draws only its \`:::post\` blocks, so ${stray.length === 1 ? "it's" : "they're"} left out. Put the words in a \`:::post\`, or move them out of the thread.`,
    });
  return {
    name,
    ...(address ? { url: address.href } : {}),
    focal: attrs.focal !== false && text(attrs.focal) !== "false",
    posts,
  };
}

// A thread is on one platform, so a post that names none takes the thread's `url`'s, or the first post's that names one.
function shared(content: Node[], address?: URL): { platform: Platform; host: string } | undefined {
  if (address) return { platform: platformOf(address), host: address.host };
  for (const child of content) {
    if (!isElement(child) || child[0] !== "post") continue;
    const written = text(child[1].platform).toLowerCase();
    const url = text(child[1].url);
    const own = url ? webUrl(url) : undefined;
    if (isPlatform(written)) return { platform: written, host: own?.host ?? "" };
    if (own) return { platform: platformOf(own), host: own.host };
  }
  return undefined;
}

// Follows each post's reply up to the root, nearest first, and stops at the cap or at a post that can't be fetched.
async function walk(thread: Thread & { url: string }, options: CompleteOptions, issues: Issue[]) {
  const chain: FetchedPost[] = [];
  let next: string | undefined = thread.url;
  while (next && chain.length < WALK) {
    try {
      const fetched = await fetchPost(next, { request: options.request });
      chain.unshift(fetched);
      next = fetched.replyTo;
    } catch (error) {
      issues.push({
        rule: "comark/social/fetch-failed",
        message: chain.length
          ? `${thread.name}: fetching the post at ${next}, which the thread replies to, failed (${errorText(error)}), so the thread starts after it. Check that it's public, or write the posts as \`:::post\` blocks.`
          : `${thread.name}: fetching ${next} failed (${errorText(error)}), so the thread shows nothing. Check the address, or write the posts as \`:::post\` blocks.`,
      });
      break;
    }
  }
  return Promise.all(
    chain.map((fetched, index) => {
      const url = new URL(fetched.url);
      const blank: Post = {
        name: `${thread.name}, post ${index + 1}`,
        platform: platformOf(url),
        platformWritten: false,
        host: url.host,
        counts: {},
        text: [],
        media: [],
      };
      return complete(blank, options, issues, fetched);
    }),
  );
}

/** Fetches what a thread's posts leave out, or, when it holds none, the posts its `url` replies to. */
export async function completeThread(
  thread: Thread,
  options: CompleteOptions,
  issues: Issue[],
): Promise<Thread> {
  const posts =
    !thread.posts.length && thread.url && options.fetch
      ? await walk({ ...thread, url: thread.url }, options, issues)
      : await Promise.all(thread.posts.map((post) => complete(post, options, issues)));
  if (!posts.length)
    issues.push({
      rule: "comark/social/empty-thread",
      message: `${thread.name} holds no \`:::post\`, so nothing shows. Write a \`:::post\` for each post, or give it the last post's \`url\` and turn on the \`fetch\` option.`,
    });
  return { ...thread, posts };
}

/**
 * Draws a thread as one card: its posts joined by a rail, the last one focal, and the posts above the one it replies to
 * folded into a `<details>` once there are more than `FOLD`. The platform's logo sits in the card's corner.
 */
export function drawThread(thread: Thread, look: Look): ElementNode | undefined {
  const { posts } = thread;
  const last = posts.length - 1;
  const tip = posts[last];
  if (!tip) return undefined;
  const rows = posts.map((post, index) =>
    drawPost(post, {
      ...look,
      chips: false,
      thread: true,
      focal: thread.focal && index === last,
      rail: index < last,
    }),
  );
  const folded = last > FOLD ? rows.slice(0, last - 1) : [];
  const shown = rows.slice(folded.length);
  const info = PLATFORM[tip.platform];
  const href = tip.url ?? thread.url;
  const site = tip.platform === "generic" ? (href ? new URL(href).host : undefined) : info.name;
  const logo: ElementNode = href
    ? ["a", { class: "csl-logo", href, "aria-label": `View on ${site}` }]
    : ["span", { class: "csl-logo", role: "img", "aria-label": info.name }];
  const children: Node[] = [logo];
  if (folded.length)
    children.push([
      "details",
      { class: "csl-earlier" },
      [
        "summary",
        {},
        ["span", { class: "csl-closed" }, "Show"],
        ["span", { class: "csl-opened" }, "Hide"],
        ` ${folded.length} earlier posts`,
      ],
      ...folded,
    ]);
  children.push(...shown);
  return [
    "thread",
    {
      platform: tip.platform,
      label: `Thread of ${posts.length} ${posts.length === 1 ? "post" : "posts"}${tip.platform === "generic" ? "" : ` on ${info.name}`}`,
      // The posts show links and handles as their platform does, so comark-chips and comark-github leave the whole thread alone.
      ...(look.chips ? { chip: "false" } : {}),
      ...(look.references ? { references: "false" } : {}),
    },
    ...children,
  ];
}
