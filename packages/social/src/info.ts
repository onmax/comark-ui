import type { ComponentInfo } from "../../../shared/component-info.ts";

const count = (what: string) =>
  ({
    type: "string",
    description: `How many ${what}, as a number such as 1234, 1,234, or 1.2K.`,
  }) as const;

/** What an editor shows for `::post`, `::thread`, `::conversation`, and `:::message`. */
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
  thread: {
    kind: "block",
    label: "Social thread",
    description:
      "Posts that reply to each other as one card, joined by a rail, with the last one larger and its full date and views.",
    props: {
      url: {
        type: "string",
        description:
          "The last post's address. With the fetch option and no posts inside, the thread is fetched up to its root, five posts at most.",
      },
      focal: {
        type: "boolean",
        default: true,
        description: "Whether the last post shows larger, with its full date and views.",
      },
    },
  },
  conversation: {
    kind: "block",
    label: "Conversation",
    description:
      "Direct messages as one chat card: your messages on the right in the primary color, everyone else's on the left by their avatar.",
    props: {
      me: {
        type: "string",
        description: "The from of your own messages, which sit on the right.",
      },
      platform: {
        type: "string",
        description: "The logo in the header.",
        options: ["x", "bluesky", "mastodon", "threads", "linkedin", "generic"],
      },
      title: {
        type: "string",
        description: "The header's title. Defaults to the names of the others in the conversation.",
      },
      request: {
        type: "boolean",
        default: false,
        description: "Whether the header shows a Message request pill.",
      },
    },
  },
  message: {
    kind: "block",
    label: "Message",
    description: "One message in a conversation, as a chat bubble.",
    props: {
      from: { type: "string", description: "Who sent it." },
      avatar: {
        type: "string",
        description:
          "The address of the sender's picture. One message's avatar shows by all of theirs.",
      },
      time: {
        type: "string",
        description: "When it was sent, as an ISO date or instant, such as 2026-11-28T09:30:00Z.",
      },
    },
  },
} satisfies Record<string, ComponentInfo>;
