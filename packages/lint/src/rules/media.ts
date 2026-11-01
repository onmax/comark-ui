import type { RuleInfo } from "./types.ts";

// comark-media's issues, COMARK3901 on.
export default {
  "comark/media/unplayable-src": {
    code: "COMARK3901",
    title: "Link a video or audio file a browser plays",
  },
  "comark/media/missing-label": {
    code: "COMARK3902",
    title: "Describe every video and audio file",
  },
  "comark/media/poster-on-audio": { code: "COMARK3903", title: "Keep `poster` off audio" },
  "comark/media/autoplay-without-muted": {
    code: "COMARK3904",
    title: "Mute a file that plays by itself",
  },
  "comark/media/unknown-prop": { code: "COMARK3905", title: "Use only a media file's options" },
  "comark/media/invalid-size": {
    code: "COMARK3906",
    title: "Give a video's `width` and `height` together, in pixels",
  },
  "comark/media/missing-size": {
    code: "COMARK3907",
    title: "Give every video its `width` and `height`",
  },
} satisfies Record<`comark/media/${string}`, RuleInfo>;
