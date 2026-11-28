/** The networks a post can come from. `generic` is any other site, drawn with a globe. */
export const PLATFORMS = ["x", "bluesky", "mastodon", "threads", "linkedin", "generic"] as const;
export type Platform = (typeof PLATFORMS)[number];

/** The counts a post can show, each a prop of `::post`. */
export const COUNTS = ["replies", "reposts", "quotes", "likes", "views", "bookmarks"] as const;
export type Count = (typeof COUNTS)[number];

type Info = {
  name: string;
  /** The counts in the order the platform's own bar shows them. */
  order: Count[];
  /** What the platform calls each count, where it isn't the prop's name. */
  words?: Partial<Record<Count, [one: string, many: string]>>;
  /** The page of a `@handle` and of a `#tag`, when the platform has one. */
  mention?: (handle: string, host: string) => string | undefined;
  tag?: (tag: string, host: string) => string;
};

export const PLATFORM: Record<Platform, Info> = {
  x: {
    name: "X",
    order: ["replies", "reposts", "likes", "views", "bookmarks"],
    mention: (handle) => `https://x.com/${handle}`,
    tag: (tag) => `https://x.com/hashtag/${encodeURIComponent(tag)}`,
  },
  bluesky: {
    name: "Bluesky",
    order: ["replies", "reposts", "likes"],
    mention: (handle) => `https://bsky.app/profile/${handle}`,
    tag: (tag) => `https://bsky.app/hashtag/${encodeURIComponent(tag)}`,
  },
  mastodon: {
    name: "Mastodon",
    order: ["replies", "reposts", "likes"],
    words: { reposts: ["boost", "boosts"], likes: ["favourite", "favourites"] },
    mention: (handle, host) => {
      const [user, server = host] = handle.split("@");
      return server ? `https://${server}/@${user}` : undefined;
    },
    tag: (tag, host) => `https://${host || "mastodon.social"}/tags/${encodeURIComponent(tag)}`,
  },
  threads: {
    name: "Threads",
    order: ["likes", "replies", "reposts"],
    mention: (handle) => `https://www.threads.com/@${handle}`,
    tag: (tag) => `https://www.threads.com/search?q=${encodeURIComponent(tag)}&serp_type=tags`,
  },
  linkedin: {
    name: "LinkedIn",
    order: ["likes", "replies", "reposts"],
    words: { likes: ["reaction", "reactions"], replies: ["comment", "comments"] },
    tag: (tag) => `https://www.linkedin.com/feed/hashtag/${encodeURIComponent(tag)}`,
  },
  generic: { name: "the web", order: [...COUNTS] },
};

const WORDS: Record<Count, [string, string]> = {
  replies: ["reply", "replies"],
  reposts: ["repost", "reposts"],
  quotes: ["quote", "quotes"],
  likes: ["like", "likes"],
  views: ["view", "views"],
  bookmarks: ["bookmark", "bookmarks"],
};

/** What `platform` calls `count`, for one or many. */
export const countWord = (platform: Platform, count: Count, value: number) =>
  (PLATFORM[platform].words?.[count] ?? WORDS[count])[value === 1 ? 0 : 1];

export const isPlatform = (value: string): value is Platform =>
  PLATFORMS.some((platform) => platform === value);

const HOSTS: [RegExp, Platform][] = [
  [/(^|\.)(x|twitter|fxtwitter|fixupx|vxtwitter)\.com$/, "x"],
  [/(^|\.)bsky\.app$/, "bluesky"],
  [/(^|\.)threads\.(net|com)$/, "threads"],
  [/(^|\.)linkedin\.com$/, "linkedin"],
];

/** The platform of a post's address: by its host, or by Mastodon's `/@user/<id>` path on any other host. */
export function platformOf(url: URL): Platform {
  const host = url.hostname.toLowerCase();
  for (const [pattern, platform] of HOSTS) if (pattern.test(host)) return platform;
  if (/^\/@[\w.-]+(@[\w.-]+)?\/\d+\/?$/.test(url.pathname)) return "mastodon";
  return "generic";
}
