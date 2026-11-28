import type { ComponentInfo } from "../../../shared/component-info.ts";

const count = (what: string) =>
  ({
    type: "string",
    description: `How many ${what}, as a number such as 1234, 1,234, or 1.2K.`,
  }) as const;

/** What an editor shows for `::post`. */
export const componentInfo = {
  post: {
    kind: "block",
    label: "Social post",
    description:
      "A post from X, Bluesky, Mastodon, Threads, LinkedIn, or any site as a static card, with its author, text, pictures, quoted post, and counts.",
    props: {
      url: {
        type: "string",
        description:
          "The post's address. The logo links to it, it picks the platform, and with the fetch option it fills in the rest.",
      },
      platform: {
        type: "string",
        description: "The logo and the counts' order and icons. Read from url when left out.",
        options: ["x", "bluesky", "mastodon", "threads", "linkedin", "generic"],
      },
      author: { type: "string", description: "The name the author shows." },
      handle: { type: "string", description: "The account, such as @jack." },
      avatar: { type: "string", description: "The address of the author's picture." },
      time: {
        type: "string",
        description: "When it was posted, as an ISO date or instant, such as 2026-11-12T10:24:00Z.",
      },
      replies: count("replies"),
      reposts: count("reposts, retweets, or boosts"),
      quotes: count("quotes"),
      likes: count("likes, favourites, or reactions"),
      views: count("views"),
      bookmarks: count("bookmarks"),
    },
  },
} satisfies Record<string, ComponentInfo>;
