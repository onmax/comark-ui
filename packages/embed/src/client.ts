import { css } from "./styles.ts";

declare global {
  interface Window {
    __comarkEmbed?: { users: number; stop: () => void };
  }
}
import { addStyles as add } from "../../../shared/styles.ts";

/** Adds the embed styles to the page once. The Vue, React, and Svelte components call it when they mount. */
export const addStyles = (): void => add("embed", css);

/** What every player may use. Each provider's own embed code asks for these. */
export const allow = "autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture";
// YouTube refuses to play without the page's origin, which `no-referrer` would withhold.
export const referrerPolicy = "strict-origin-when-cross-origin";

/**
 * Lucide's external-link, which follows a player's link, and globe, which starts a card (ISC), each as one path. Every
 * renderer draws them in the same `<svg>`, sized for a page without the styles.
 */
export const icons = {
  external: "M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6",
  globe:
    "M2 12a10 10 0 1 0 20 0 10 10 0 1 0-20 0M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20M2 12h20",
};

export { css };

/**
 * Sizes every X post on the page to the height its player reports, and returns a function that stops. X's player posts
 * `{"twttr.embed":{"method":"twttr.private.resize","params":[{"height":...}]}}` to its parent each time the post's
 * height changes. Every caller shares one listener, which stops with the last caller. The function is
 * self-contained: the HTML renderer inlines its source as a script, so it must not use anything from outside its body.
 */
export function start(): () => void {
  const running = window.__comarkEmbed;
  if (running) {
    running.users++;
    return running.stop;
  }
  const listeners = new AbortController();
  window.addEventListener(
    "message",
    (event) => {
      if (event.origin !== "https://platform.twitter.com") return;
      const message = Object(event.data)["twttr.embed"];
      if (message?.method !== "twttr.private.resize" || !Array.isArray(message.params)) return;
      const height = Number(message.params[0]?.height);
      if (!(height > 0)) return;
      for (const frame of document.querySelectorAll<HTMLIFrameElement>(
        ".ce[data-provider='x'] iframe",
      ))
        if (frame.contentWindow === event.source) frame.style.height = `${Math.ceil(height)}px`;
    },
    { signal: listeners.signal },
  );
  const state = {
    users: 1,
    stop: () => {
      if (--state.users > 0) return;
      listeners.abort();
      window.__comarkEmbed = undefined;
    },
  };
  window.__comarkEmbed = state;
  return state.stop;
}
