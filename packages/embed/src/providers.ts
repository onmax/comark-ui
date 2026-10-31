/**
 * How tall a player is: a 16:9 or 9:16 video, Spotify's compact or full player, a tool at a fixed height, or an X post
 * as tall as the post.
 */
export type Size = "video" | "short" | "compact" | "list" | "app" | "post";

export interface Player {
  /** The provider's key, such as `youtube`, written to `data-provider`. */
  provider: string;
  /** The iframe's `src`. */
  src: string;
  /** What the iframe is called when the block has no `title`, such as "YouTube video". */
  label: string;
  size: Size;
}

interface Provider {
  hosts: string[];
  /** What a link to it holds, for the message when it can't be read. */
  holds: string;
  /** Whether the player can start at a time. */
  seeks?: boolean;
  /** The player for a link, or, when the link holds no ID, what to write instead. */
  read: (url: URL, start: number | undefined) => Player | { hint: string };
}

const match = (pattern: RegExp, value: string) => pattern.exec(value) ?? undefined;

// `t=90`, `t=90s`, or `t=1h2m3s`, as YouTube writes them.
function seconds(value: string | null) {
  const parts = value ? match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?$/, value) : undefined;
  if (!parts) return;
  const [, h = 0, m = 0, s = 0] = parts;
  const total = Number(h) * 3600 + Number(m) * 60 + Number(s);
  return Number.isSafeInteger(total) && total > 0 ? total : undefined;
}

const PROVIDERS = {
  youtube: {
    hosts: ["youtube.com", "youtu.be", "youtube-nocookie.com"],
    holds: "a video ID",
    seeks: true,
    read(url, start) {
      const path = url.hostname.endsWith("youtu.be")
        ? match(/^\/([\w-]{11})\/?$/, url.pathname)
        : (match(/^\/(?:shorts|embed|live)\/([\w-]{11})\/?$/, url.pathname) ??
          (url.pathname === "/watch"
            ? match(/^([\w-]{11})$/, url.searchParams.get("v") ?? "")
            : undefined));
      const id = path?.[1];
      if (!id) return { hint: "Use a youtube.com/watch, youtu.be, or /shorts/ link." };
      const at = start ?? seconds(url.searchParams.get("t"));
      return {
        provider: "youtube",
        src: `https://www.youtube-nocookie.com/embed/${id}${at ? `?start=${at}` : ""}`,
        label: "YouTube video",
        size: url.pathname.startsWith("/shorts/") ? "short" : "video",
      };
    },
  },
  vimeo: {
    hosts: ["vimeo.com", "player.vimeo.com"],
    holds: "a video ID",
    seeks: true,
    read(url, start) {
      // An unlisted video carries its hash after the ID, or as `h` in a player link.
      const [, id, hash = url.searchParams.get("h")] =
        match(/\/(\d+)(?:\/([\da-f]+))?\/?$/, url.pathname) ?? [];
      if (!id) return { hint: "Use a vimeo.com/<number> link." };
      if (hash && !/^[\da-f]+$/.test(hash))
        return { hint: "The `h` hash of an unlisted video is letters a to f and digits only." };
      return {
        provider: "vimeo",
        src: `https://player.vimeo.com/video/${id}?${hash ? `h=${hash}&dnt=1` : "dnt=1"}${start ? `#t=${start}s` : ""}`,
        label: "Vimeo video",
        size: "video",
      };
    },
  },
  loom: {
    hosts: ["loom.com"],
    holds: "a video ID",
    read(url) {
      const id = match(/^\/(?:share|embed)\/(?:[^/]*-)?([\da-f]{32})\/?$/, url.pathname)?.[1];
      if (!id) return { hint: "Use a loom.com/share/<id> link." };
      return {
        provider: "loom",
        src: `https://www.loom.com/embed/${id}`,
        label: "Loom video",
        size: "video",
      };
    },
  },
  spotify: {
    hosts: ["open.spotify.com"],
    holds: "a track, album, playlist, episode, show, or artist",
    read(url) {
      const [, type, id] =
        match(
          /^(?:\/intl-[\w-]+)?(?:\/embed)?\/(track|album|playlist|episode|show|artist)\/(\w+)\/?$/,
          url.pathname,
        ) ?? [];
      if (!type || !id)
        return {
          hint: "Use an open.spotify.com/track, album, playlist, episode, show, or artist link.",
        };
      return {
        provider: "spotify",
        src: `https://open.spotify.com/embed/${type}/${id}`,
        label: `Spotify ${type}`,
        size: type === "track" || type === "episode" ? "compact" : "list",
      };
    },
  },
  codepen: {
    hosts: ["codepen.io"],
    holds: "a pen",
    read(url) {
      const [, user, id] =
        match(/^\/([\w-]+)\/(?:pen|full|details|embed)\/(\w+)\/?$/, url.pathname) ?? [];
      if (!user || !id) return { hint: "Use a codepen.io/<user>/pen/<id> link." };
      return {
        provider: "codepen",
        src: `https://codepen.io/${user}/embed/${id}`,
        label: "CodePen pen",
        size: "app",
      };
    },
  },
  stackblitz: {
    hosts: ["stackblitz.com"],
    holds: "a project",
    read(url) {
      if (
        !/^\/(?:edit\/(?:[\w.-]|%[0-9A-Fa-f]{2})+|github\/(?:[\w.-]|%[0-9A-Fa-f]{2})+\/(?:[\w.-]|%[0-9A-Fa-f]{2})+(?:\/(?:[\w.@~-]|%[0-9A-Fa-f]{2})+)*)\/?$/.test(
          url.pathname,
        )
      )
        return {
          hint: "Use a stackblitz.com/edit/<project> or stackblitz.com/github/<owner>/<repo>[/<path>] link.",
        };
      // Options such as `file` and `view` stay on the link.
      const src = new URL(url.href);
      src.hostname = "stackblitz.com";
      src.searchParams.set("embed", "1");
      src.hash = "";
      return { provider: "stackblitz", src: src.href, label: "StackBlitz project", size: "app" };
    },
  },
  figma: {
    hosts: ["figma.com"],
    holds: "a file",
    read(url) {
      const [, type, key] =
        match(/^\/(design|file|proto|board|slides|deck)\/(\w+)/, url.pathname) ?? [];
      if (!type || !key)
        return { hint: "Use a figma.com/design, proto, board, slides, or deck link." };
      // Figma renamed /file/ links to /design/, and options such as `node-id` stay on the link.
      const src = new URL(`https://embed.figma.com/${type === "file" ? "design" : type}/${key}`);
      for (const [name, value] of url.searchParams) src.searchParams.set(name, value);
      src.searchParams.set("embed-host", "comark");
      return { provider: "figma", src: src.href, label: "Figma file", size: "app" };
    },
  },
  x: {
    hosts: ["x.com", "twitter.com", "mobile.x.com", "mobile.twitter.com"],
    holds: "a post ID",
    read(url) {
      const id = match(
        /^\/(?:\w+|i\/web)\/status(?:es)?\/(\d+)(?:\/(?:photo|video)\/\d+)?\/?$/,
        url.pathname,
      )?.[1];
      if (!id) return { hint: "Use an x.com/<user>/status/<id> link." };
      // X's own player, the one its widgets.js loads. Its height follows the post, which `start()` reads from it.
      return {
        provider: "x",
        src: `https://platform.twitter.com/embed/Tweet.html?id=${id}&dnt=true`,
        label: "X post",
        size: "post",
      };
    },
  },
} satisfies Record<string, Provider>;

/** Hostnames as people paste them, so `www.` and `m.` don't hide a provider. */
export const hostOf = (url: URL) => url.hostname.toLowerCase().replace(/^(?:www|m)\./, "");

/** The provider for a link's host, if it has a player. */
export function providerOf(url: URL): Provider | undefined {
  const host = hostOf(url);
  return Object.values<Provider>(PROVIDERS).find((provider) => provider.hosts.includes(host));
}
