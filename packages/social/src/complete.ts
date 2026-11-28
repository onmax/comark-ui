import { fetchPost, type FetchedPost } from "./fetch.ts";
import { inline } from "./images.ts";
import { PLATFORM, platformOf, type Platform } from "./platforms.ts";
import { merge, type Issue, type Post } from "./post.ts";
import { childrenOf, isElement } from "../../../shared/nodes.ts";
import { errorText, text } from "../../../shared/text.ts";

export type CompleteOptions = { fetch?: boolean; maxImageSize?: number };

const AVATAR_LIMIT = 100_000;
const FETCHED = new Set<Platform>(["x", "bluesky", "mastodon"]);
const KB = (bytes: number) => `${Math.round(bytes / 1000)} KB`;

// Downloads a post's avatar and fetched pictures and inlines them; one too large keeps its address.
async function inlinePictures(post: Post, fetched: boolean, limit: number, issues: Issue[]) {
  const tasks: Promise<void>[] = [];
  const picture = (src: string, cap: number, what: string, set: (src: string) => void) =>
    tasks.push(
      inline(src, cap).then((found) => {
        if ("src" in found) set(found.src);
        else if ("large" in found)
          issues.push({
            rule: "comark/social/large-media",
            message: `${post.name}: ${what} at ${src} is larger than ${KB(cap)}, so it isn't inlined and the page loads it from ${new URL(src).host}. Save it with the document and write its path, or raise \`maxImageSize\`.`,
          });
        else
          issues.push({
            rule: "comark/social/fetch-failed",
            message: `${post.name}: ${what} at ${src} couldn't be downloaded (${found.error}), so the page loads it from ${new URL(src).host}. Check the address, or save the picture with the document and write its path.`,
          });
      }),
    );
  if (post.avatar && /^https?:/.test(post.avatar))
    picture(post.avatar, AVATAR_LIMIT, "the avatar", (src) => (post.avatar = src));
  if (fetched)
    for (const node of post.media) {
      const image = node[0] === "img" ? node : childrenOf(node).find((child) => isElement(child));
      if (!isElement(image) || image[0] !== "img") continue;
      const src = text(image[1].src);
      if (/^https?:/.test(src))
        picture(src, limit, "the picture", (inlined) => (image[1].src = inlined));
    }
  if (post.quote) tasks.push(inlinePictures(post.quote, fetched, limit, issues));
  await Promise.all(tasks);
}

/** Fetches what a post leaves out when `fetch` is on, and inlines its pictures. */
export async function complete(post: Post, options: CompleteOptions, issues: Issue[]) {
  // Threads, LinkedIn, and other sites have no public API, so their posts are written by hand.
  if (!options.fetch || !post.url || !FETCHED.has(platformOf(new URL(post.url)))) return post;
  let fetched: FetchedPost;
  try {
    fetched = await fetchPost(post.url);
  } catch (error) {
    const name = PLATFORM[post.platform].name;
    issues.push({
      rule: "comark/social/fetch-failed",
      message: `${post.name}: fetching ${post.url} from ${name} failed (${errorText(error)}), so the card shows only what's written. Check the address, or write the post's props by hand.`,
    });
    await inlinePictures(post, false, options.maxImageSize ?? 500_000, issues);
    return post;
  }
  const filled = merge(post, fetched);
  await inlinePictures(filled, !post.media.length, options.maxImageSize ?? 500_000, issues);
  return filled;
}
