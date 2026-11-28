import type { RuleInfo } from "./types.ts";

// comark-social's issues, COMARK4901 on.
export default {
  "comark/social/unknown-prop": {
    code: "COMARK4901",
    title: "Use only the props a post, thread, conversation, or message reads",
  },
  "comark/social/unknown-platform": {
    code: "COMARK4902",
    title: "Name a platform comark-social knows",
  },
  "comark/social/invalid-count": { code: "COMARK4903", title: "Write counts as numbers" },
  "comark/social/invalid-url": {
    code: "COMARK4904",
    title: "Give a post's `url` and `avatar` full web addresses",
  },
  "comark/social/invalid-time": { code: "COMARK4905", title: "Write a post's `time` as a date" },
  "comark/social/missing-author": { code: "COMARK4906", title: "Name every post's author" },
  "comark/social/extra-quote": { code: "COMARK4907", title: "Quote one post in a post" },
  "comark/social/fetch-failed": {
    code: "COMARK4908",
    title: "Fetch posts and pictures that exist and are public",
  },
  "comark/social/large-media": {
    code: "COMARK4909",
    title: "Keep a fetched picture under `maxImageSize`",
  },
  "comark/social/thread-content": {
    code: "COMARK4910",
    title: "Write a thread's words in its posts",
  },
  "comark/social/empty-thread": { code: "COMARK4911", title: "Give every thread its posts" },
  "comark/social/conversation-content": {
    code: "COMARK4912",
    title: "Write a conversation's words in its messages",
  },
  "comark/social/empty-conversation": {
    code: "COMARK4913",
    title: "Give every conversation its messages",
  },
  "comark/social/missing-sender": { code: "COMARK4914", title: "Say who sent every message" },
} satisfies Record<`comark/social/${string}`, RuleInfo>;
