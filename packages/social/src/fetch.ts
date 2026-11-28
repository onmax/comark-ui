import { PLATFORM, platformOf, type Count, type Platform } from "./platforms.ts";

/** A picture or a video's still in a post, at its address on the platform. */
export interface FetchedMedia {
  src: string;
  alt?: string;
  width?: number;
  height?: number;
  /** A video, drawn as its still with a play mark. */
  video?: boolean;
}

/** A post as the platform's public API returns it, with every picture at its address on the platform. */
export interface FetchedPost {
  platform: Platform;
  url: string;
  author: string;
  /** With its `@`, and with the server on Mastodon: `@Gargron@mastodon.social`. */
  handle: string;
  avatar?: string;
  /** An ISO instant. */
  time: string;
  /** Plain text with its line breaks and full links. */
  text: string;
  counts: Partial<Record<Count, number>>;
  media: FetchedMedia[];
  quote?: FetchedPost;
  /** The address of the post this one replies to. */
  replyTo?: string;
}

export interface FetchPostOptions {
  signal?: AbortSignal;
}

/** Why a post couldn't be fetched, in a sentence that ends with what to do. */
export class FetchPostError extends Error {
  override name = "FetchPostError";
}

const HEADERS = { accept: "application/json", "user-agent": "comark-social" };

async function json(url: string, options: FetchPostOptions): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(url, {
      headers: HEADERS,
      signal: options.signal ?? AbortSignal.timeout(10_000),
    });
  } catch (error) {
    throw new FetchPostError(
      `${new URL(url).host} didn't answer (${error instanceof Error ? error.message : String(error)})`,
    );
  }
  if (response.status === 404 || response.status === 401 || response.status === 403)
    throw new FetchPostError("the post doesn't exist or isn't public");
  if (!response.ok)
    throw new FetchPostError(`${new URL(url).host} answered HTTP ${response.status}`);
  try {
    return await response.json();
  } catch {
    throw new FetchPostError(`${new URL(url).host} didn't answer with JSON`);
  }
}

type Json = Record<string, unknown>;
const record = (value: unknown): Json =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? // SAFETY: a non-null, non-array JSON value is an object, read by string keys; its values stay unknown.
      (value as Json)
    : {};
const list = (value: unknown): Json[] => (Array.isArray(value) ? value.map(record) : []);
const string = (value: unknown) => (typeof value === "string" ? value : undefined);
const number = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;
const sum = (...values: unknown[]) => {
  let total: number | undefined;
  for (const value of values) {
    const found = number(value);
    if (found !== undefined) total = (total ?? 0) + found;
  }
  return total;
};
const counts = (entries: [Count, number | undefined][]) =>
  // SAFETY: each key is a Count, and the filter keeps only the entries with a number.
  Object.fromEntries(entries.filter(([, value]) => value !== undefined)) as FetchedPost["counts"];
const iso = (value: unknown) => {
  const date = new Date(
    typeof value === "number" ? value * 1000 : typeof value === "string" ? value : "",
  );
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
};

// X: fxtwitter's public API, which answers without a key.
function xPost(tweet: Json): FetchedPost {
  const author = record(tweet.author);
  const media = record(tweet.media);
  const photos = list(media.photos).map((photo): FetchedMedia => ({
    src: string(photo.url) ?? "",
    alt: string(photo.altText),
    width: number(photo.width),
    height: number(photo.height),
  }));
  const videos = list(media.videos).map((video): FetchedMedia => ({
    src: string(video.thumbnail_url) ?? "",
    width: number(video.width),
    height: number(video.height),
    video: true,
  }));
  const screen = string(author.screen_name) ?? "";
  const parent = string(tweet.replying_to_status);
  const quote = tweet.quote ? xPost(record(tweet.quote)) : undefined;
  return {
    platform: "x",
    url: string(tweet.url) ?? `https://x.com/${screen}/status/${string(tweet.id) ?? ""}`,
    author: string(author.name) ?? screen,
    handle: `@${screen}`,
    avatar: string(author.avatar_url),
    time: iso(tweet.created_timestamp ?? tweet.created_at),
    // The link to the post's own media or quote ends the text; the card draws those instead.
    text: (string(tweet.text) ?? "").replace(/\s*https:\/\/t\.co\/\w+\s*$/, ""),
    counts: counts([
      ["replies", number(tweet.replies)],
      // X counts quotes among reposts.
      ["reposts", sum(tweet.retweets, tweet.quotes)],
      ["likes", number(tweet.likes)],
      ["views", number(tweet.views)],
      ["bookmarks", number(tweet.bookmarks)],
    ]),
    media: [...photos, ...videos].filter((item) => item.src),
    ...(quote ? { quote } : {}),
    ...(parent
      ? { replyTo: `https://x.com/${string(tweet.replying_to) ?? "i"}/status/${parent}` }
      : {}),
  };
}

async function fetchX(url: URL, options: FetchPostOptions) {
  const id = /\/status(?:es)?\/(\d+)/.exec(url.pathname)?.[1];
  if (!id) throw new FetchPostError("the address has no `/status/<id>`");
  const body = record(await json(`https://api.fxtwitter.com/i/status/${id}`, options));
  if (!body.tweet) throw new FetchPostError("the post doesn't exist or isn't public");
  return xPost(record(body.tweet));
}

// Bluesky: the public AppView, which answers without signing in.
const BSKY = "https://public.api.bsky.app/xrpc";
const bskyUrl = (uri: string, handle?: string) => {
  const [, did = "", , rkey = ""] = /^at:\/\/([^/]+)\/([^/]+)\/([^/]+)$/.exec(uri) ?? [];
  return `https://bsky.app/profile/${handle ?? did}/post/${rkey}`;
};

// A facet's range counts UTF-8 bytes, and a link's text is shortened, so the full link goes back in its place.
function bskyText(text: string, facets: Json[]) {
  const bytes = new TextEncoder().encode(text);
  const decode = (from: number, to: number) => new TextDecoder().decode(bytes.subarray(from, to));
  const links = facets
    .flatMap((facet) => {
      const index = record(facet.index);
      const link = list(facet.features).find(
        (feature) => feature.$type === "app.bsky.richtext.facet#link",
      );
      const start = number(index.byteStart);
      const end = number(index.byteEnd);
      const uri = string(link?.uri);
      return uri && start !== undefined && end !== undefined ? [{ start, end, uri }] : [];
    })
    .sort((a, b) => a.start - b.start);
  let out = "";
  let at = 0;
  for (const { start, end, uri } of links) {
    if (start < at) continue;
    out += decode(at, start) + uri;
    at = end;
  }
  return out + decode(at, bytes.length);
}

function bskyMedia(embed: Json): FetchedMedia[] {
  const type = string(embed.$type) ?? "";
  const ratio = (item: Json) => {
    const aspect = record(item.aspectRatio);
    return { width: number(aspect.width), height: number(aspect.height) };
  };
  if (type.startsWith("app.bsky.embed.images"))
    return list(embed.images).map((image) => ({
      src: string(image.fullsize) ?? string(image.thumb) ?? "",
      alt: string(image.alt) || undefined,
      ...ratio(image),
    }));
  if (type.startsWith("app.bsky.embed.video"))
    return [
      {
        src: string(embed.thumbnail) ?? "",
        alt: string(embed.alt) || undefined,
        ...ratio(embed),
        video: true,
      },
    ];
  if (type.startsWith("app.bsky.embed.recordWithMedia")) return bskyMedia(record(embed.media));
  return [];
}

function bskyQuote(embed: Json): FetchedPost | undefined {
  const type = string(embed.$type) ?? "";
  const view = type.startsWith("app.bsky.embed.recordWithMedia")
    ? record(record(embed.record).record)
    : type.startsWith("app.bsky.embed.record")
      ? record(embed.record)
      : undefined;
  if (!view || view.$type !== "app.bsky.embed.record#viewRecord") return undefined;
  const value = record(view.value);
  return bskyPost({
    uri: view.uri,
    author: view.author,
    record: value,
    embed: list(view.embeds)[0],
    replyCount: view.replyCount,
    repostCount: view.repostCount,
    likeCount: view.likeCount,
    quoteCount: view.quoteCount,
  });
}

function bskyPost(post: Json): FetchedPost {
  const author = record(post.author);
  const value = record(post.record);
  const embed = record(post.embed);
  const handle = string(author.handle) ?? "";
  const parent = string(record(record(value.reply).parent).uri);
  const quote = bskyQuote(embed);
  return {
    platform: "bluesky",
    url: bskyUrl(string(post.uri) ?? "", handle || undefined),
    author: string(author.displayName) || handle,
    handle: `@${handle}`,
    avatar: string(author.avatar),
    time: iso(value.createdAt),
    text: bskyText(string(value.text) ?? "", list(value.facets)),
    counts: counts([
      ["replies", number(post.replyCount)],
      // Bluesky counts quotes among reposts.
      ["reposts", sum(post.repostCount, post.quoteCount)],
      ["likes", number(post.likeCount)],
    ]),
    media: bskyMedia(embed).filter((item) => item.src),
    ...(quote ? { quote } : {}),
    ...(parent ? { replyTo: bskyUrl(parent) } : {}),
  };
}

async function bskyUri(url: URL, options: FetchPostOptions) {
  const [, actor, rkey] = /^\/profile\/([^/]+)\/post\/([^/]+)/.exec(url.pathname) ?? [];
  if (!actor || !rkey) throw new FetchPostError("the address isn't `/profile/<handle>/post/<id>`");
  let did = actor;
  if (!actor.startsWith("did:")) {
    const found = record(
      await json(
        `${BSKY}/com.atproto.identity.resolveHandle?handle=${encodeURIComponent(actor)}`,
        options,
      ),
    );
    did = string(found.did) ?? "";
    if (!did) throw new FetchPostError(`Bluesky doesn't know the handle ${actor}`);
  }
  return `at://${did}/app.bsky.feed.post/${rkey}`;
}

async function fetchBluesky(url: URL, options: FetchPostOptions) {
  const uri = await bskyUri(url, options);
  const body = record(
    await json(`${BSKY}/app.bsky.feed.getPosts?uris=${encodeURIComponent(uri)}`, options),
  );
  const post = list(body.posts)[0];
  if (!post) throw new FetchPostError("the post doesn't exist or isn't public");
  return bskyPost(post);
}

// Mastodon: the server's own public API, which answers for public posts without signing in.
const ENTITIES = new Map([
  ["amp", "&"],
  ["lt", "<"],
  ["gt", ">"],
  ["quot", '"'],
  ["apos", "'"],
  ["nbsp", " "],
]);
const decode = (html: string) =>
  html.replace(/&(#x[\da-f]+|#\d+|\w+);/gi, (whole, name: string) =>
    name[0] === "#"
      ? String.fromCodePoint(
          name[1]?.toLowerCase() === "x" ? parseInt(name.slice(2), 16) : Number(name.slice(1)),
        )
      : (ENTITIES.get(name.toLowerCase()) ?? whole),
  );

// Mastodon writes a post as HTML: paragraphs, breaks, and links whose text it shortens.
function mastodonText(html: string, host: string) {
  return decode(
    html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>\s*<p[^>]*>/gi, "\n\n")
      .replace(/<a\s([^>]*)>([\s\S]*?)<\/a>/gi, (_, attrs: string, inner: string) => {
        const href = decode(/href="([^"]*)"/i.exec(attrs)?.[1] ?? "");
        const words = inner.replace(/<[^>]+>/g, "");
        if (/\bhashtag\b/.test(attrs)) return words;
        if (/\bmention\b/.test(attrs)) {
          let server = "";
          try {
            server = new URL(href).host;
          } catch {}
          return server && server !== host ? `${words}@${server}` : words;
        }
        return href || words;
      })
      .replace(/<[^>]+>/g, ""),
  ).trim();
}

function mastodonPost(status: Json, host: string): FetchedPost {
  const account = record(status.account);
  const acct = string(account.acct) ?? "";
  const quoted = record(record(status.quote).quoted_status);
  const media = list(status.media_attachments).map((item): FetchedMedia => {
    const original = record(record(item.meta).original);
    const type = string(item.type);
    return {
      src: (type === "image" ? string(item.url) : string(item.preview_url)) ?? "",
      alt: string(item.description) || undefined,
      width: number(original.width),
      height: number(original.height),
      ...(type === "video" || type === "gifv" ? { video: true } : {}),
    };
  });
  const parent = string(status.in_reply_to_id);
  return {
    platform: "mastodon",
    url: string(status.url) ?? string(status.uri) ?? "",
    author: string(account.display_name) || string(account.username) || acct,
    handle: `@${acct.includes("@") ? acct : `${acct}@${host}`}`,
    avatar: string(account.avatar),
    time: iso(status.created_at),
    text: mastodonText(string(status.content) ?? "", host),
    counts: counts([
      ["replies", number(status.replies_count)],
      ["reposts", number(status.reblogs_count)],
      ["likes", number(status.favourites_count)],
    ]),
    media: media.filter((item) => item.src),
    ...(quoted.id ? { quote: mastodonPost(quoted, host) } : {}),
    ...(parent ? { replyTo: `https://${host}/@${acct}/${parent}` } : {}),
  };
}

async function fetchMastodon(url: URL, options: FetchPostOptions) {
  const id = /\/(\d+)\/?$/.exec(url.pathname)?.[1];
  if (!id) throw new FetchPostError("the address has no post id");
  const status = record(await json(`https://${url.host}/api/v1/statuses/${id}`, options));
  if (!status.id) throw new FetchPostError("the post doesn't exist or isn't public");
  return mastodonPost(status, url.host);
}

const FETCHERS: Partial<
  Record<Platform, (url: URL, options: FetchPostOptions) => Promise<FetchedPost>>
> = { x: fetchX, bluesky: fetchBluesky, mastodon: fetchMastodon };

const cache = new Map<string, Promise<FetchedPost>>();

/**
 * Fetches a public post from X (through api.fxtwitter.com), Bluesky (public.api.bsky.app), or a Mastodon server, by its
 * address. Threads and LinkedIn have no public API, so their posts are written by hand. Answers are cached per process,
 * and a failed one isn't kept. Throws a `FetchPostError` that says why.
 */
export function fetchPost(address: string, options: FetchPostOptions = {}): Promise<FetchedPost> {
  let url: URL;
  try {
    url = new URL(address);
  } catch {
    return Promise.reject(new FetchPostError("the address isn't a URL"));
  }
  const platform = platformOf(url);
  const fetcher = FETCHERS[platform];
  if (!fetcher)
    return Promise.reject(
      new FetchPostError(
        platform === "generic"
          ? "it isn't an X, Bluesky, or Mastodon post"
          : `${PLATFORM[platform].name} has no public API`,
      ),
    );
  const key = url.href;
  let found = cache.get(key);
  if (!found) {
    found = fetcher(url, options);
    found.catch(() => cache.delete(key));
    cache.set(key, found);
  }
  return found;
}
