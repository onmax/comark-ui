import { fetchPost } from "./fetch.ts";
import { inline } from "./images.ts";
import { PLATFORM, platformOf, type Platform } from "./platforms.ts";
import { merge, webUrl, type Issue, type Post } from "./post.ts";
import { childrenOf, isElement } from "../../../shared/nodes.ts";
import { errorText, text } from "../../../shared/text.ts";
import type { SocialRequest } from "./request.ts";

export type CompleteOptions = { fetch?: boolean; maxImageSize?: number; request?: SocialRequest };

const AVATAR_LIMIT = 100_000;
const FETCHED = new Set<Platform>(["x", "bluesky", "mastodon"]);
const KB = (bytes: number) => `${Math.round(bytes / 1000)} KB`;

// Downloads a post's avatar and fetched pictures and inlines them; one too large keeps its address.
async function inlinePictures(
  post: Post,
  fetched: boolean,
  options: CompleteOptions,
  issues: Issue[],
) {
  const tasks: Promise<void>[] = [];
  const picture = (src: string, cap: number, what: string, set: (src: string) => void) => {
    const url = webUrl(src);
    if (!url) return;
    tasks.push(
      inline(url, cap, options.request).then((found) => {
        if ("src" in found) set(found.src);
        else if ("large" in found)
          issues.push({
            rule: "comark/social/large-media",
            message: `${post.name}: ${what} at ${src} is larger than ${KB(cap)}, so it isn't inlined and the page loads it from ${url.host}. Save it with the document and write its path, or raise \`maxImageSize\`.`,
          });
        else
          issues.push({
            rule: "comark/social/fetch-failed",
            message: `${post.name}: ${what} at ${src} couldn't be downloaded (${found.error}), so it isn't inlined. Check the address, or save the picture with the document and write its path.`,
          });
      }),
    );
  };
  if (post.avatar && /^https?:/i.test(post.avatar))
    picture(post.avatar, AVATAR_LIMIT, "the avatar", (src) => (post.avatar = src));
  if (fetched)
    for (const node of post.media) {
      const image = node[0] === "img" ? node : childrenOf(node).find((child) => isElement(child));
      if (!isElement(image) || image[0] !== "img") continue;
      const src = text(image[1].src);
      if (/^https?:/i.test(src))
        picture(
          src,
          options.maxImageSize ?? 500_000,
          "the picture",
          (inlined) => (image[1].src = inlined),
        );
    }
  await Promise.all(tasks);
}

/** Fetches what a post leaves out when `fetch` is on, and inlines its pictures. */
export async function complete(
  post: Post,
  options: CompleteOptions,
  issues: Issue[],
): Promise<Post> {
  const finish = async (written: Post, quoted: boolean, fromResponse: boolean) => {
    let filled = written;
    let fetchedMedia = fromResponse;
    const url = written.url ? webUrl(written.url) : undefined;
    const platform = url ? platformOf(url) : undefined;
    const hasApi = platform !== undefined && FETCHED.has(platform);
    if (options.fetch && !fromResponse && url && hasApi) {
      try {
        filled = merge(written, await fetchPost(url.href, { request: options.request }), !quoted);
        fetchedMedia = !written.media.length;
      } catch (error) {
        issues.push({
          rule: "comark/social/fetch-failed",
          message: `${written.name}: fetching ${url.href} from ${PLATFORM[platform].name} failed (${errorText(error)}), so the card shows only what's written. Check the address, or write the post's props by hand.`,
        });
      }
    }
    if (options.fetch && (fromResponse || hasApi))
      await inlinePictures(filled, fetchedMedia, options, issues);
    if (filled.author || filled.handle) return filled;
    issues.push({
      rule: "comark/social/missing-author",
      message: `${filled.name} has no \`author\` or \`handle\`, so the card names no one. Write \`author\`, or give it a \`url\` and turn on the \`fetch\` option.`,
    });
    return filled;
  };
  const filled = await finish(post, false, false);
  if (filled.quote) filled.quote = await finish(filled.quote, true, !post.quote);
  return filled;
}
