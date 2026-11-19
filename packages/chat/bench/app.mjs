// The page the benchmark drives: one AI SDK text part rendered by comark-chat's React `MessageParts` with comark-ui's
// React preset and its lazy Shiki, as an app that installs comark-ui renders a chat. stream.mjs builds it twice, from
// the working tree and from a base commit.
import { createElement as h, useState } from "react";
import { createRoot } from "react-dom/client";
import { MessageParts } from "../src/react.ts";
import ui from "../../ui/src/react.ts";
import { createLazyHighlighter } from "../../ui/src/highlighter.ts";

const shiki = createLazyHighlighter({
  languages: {
    python: () => import("shiki/langs/python.mjs"),
    typescript: () => import("shiki/langs/typescript.mjs"),
    shellscript: () => import("shiki/langs/shellscript.mjs"),
  },
  aliases: { ts: "typescript", sh: "shellscript" },
  themes: {
    light: () => import("shiki/themes/github-light.mjs"),
    dark: () => import("shiki/themes/github-dark.mjs"),
  },
});

// A component with React state, so the chat check sees whether the prose streaming after it remounts it.
function Counter() {
  const [count, setCount] = useState(0);
  return h(
    "button",
    { type: "button", className: "bench-counter", onClick: () => setCount((n) => n + 1) },
    `Clicked ${count}`,
  );
}

const preset = ui({
  shiki,
  chips: { download: false },
  icon: { fetch: false },
  badge: { download: false },
});
const plugins = preset.plugins;
const components = { ...preset.components, counter: Counter };

const container = document.getElementById("chat");
const root = createRoot(container);

// Resolves when the deferred render of `text` reaches the DOM. The build marks `.comark-content` with the length of the
// source its tree was parsed from, so React's first commit, which still shows the previous tree, never counts.
function show(text, streaming, key = "replay") {
  const length = String(text.length) + (streaming ? "" : "-done");
  return new Promise((resolve) => {
    const observer = new MutationObserver(() => {
      if (!container.querySelector(`[data-bench-length="${length}"]`)) return;
      observer.disconnect();
      resolve(performance.now());
    });
    observer.observe(container, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["data-bench-length"],
    });
    root.render(
      h(MessageParts, {
        key,
        parts: [{ type: "text", text, state: streaming ? "streaming" : "done" }],
        streaming,
        plugins,
        components,
      }),
    );
  });
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));

// The original replay's update points: every `size` UTF-16 units, never splitting a surrogate pair.
function endsOf(source, size) {
  const ends = [];
  for (let end = 0; end < source.length;) {
    end = Math.min(end + size, source.length);
    const code = source.charCodeAt(end - 1);
    if (code >= 0xd800 && code <= 0xdbff && end < source.length) end++;
    ends.push(end);
  }
  return ends;
}

// Where the streaming caret sits: in the text, or after the last block, on a line of its own.
function caret() {
  const span = container.querySelector('[style*="pulse"]');
  if (!span) return "none";
  return span.parentElement.classList.contains("comark-content")
    ? "after the blocks"
    : "in the text";
}

window.bench = {
  /** Renders each fence language once and then an empty stream, so the replay starts warm. */
  async warm(source) {
    const languages = new Set(["python"]);
    for (const match of source.matchAll(/^ {0,3}(?:`{3,}|~{3,})([\w+-]+)/gm))
      languages.add(match[1]);
    const warmup =
      "Warmup **formatting**, *emphasis*, and [navigation](/warmup).\n\n" +
      [...languages].map((language) => "```" + language + "\nwarmup\n```\n").join("\n");
    await show(warmup, false, "warm");
    await delay(500);
    await show("", true);
    await frame();
    await frame();
  },
  /** Replays `source` every `interval` ms, returning each update's time from `root.render()` to its DOM commit. */
  async run(source, { size = 256, interval = 40, snapshotEvery = 0 } = {}) {
    const updates = [];
    const snapshots = [];
    const ends = endsOf(source, size);
    for (const [index, end] of ends.entries()) {
      if (interval) await delay(interval);
      const requested = performance.now();
      const last = index === ends.length - 1;
      const committed = await show(source.slice(0, end), !last);
      updates.push(Math.round((committed - requested) * 10) / 10);
      if (snapshotEvery && (last || (index + 1) % snapshotEvery === 0))
        snapshots.push(container.innerHTML);
    }
    // The work a commit leaves for the next frames, such as styles, layout, and comark-code's measuring, counts too.
    await frame();
    await frame();
    const fences = [...container.querySelectorAll("pre code")];
    return {
      updates,
      snapshots,
      fences: fences.length,
      highlightedFences: fences.filter((node) => node.querySelector('[style*="color:"]')).length,
    };
  },
  /**
   * Streams `source` in 32-unit updates and, once `marker` has arrived, clicks the counter twice and picks the code
   * group's second tab, then reads whether both kept their state through the updates that follow.
   */
  async interact(source, marker) {
    const ends = endsOf(source, 32);
    let actedAt = -1;
    const carets = new Set();
    for (const [index, end] of ends.entries()) {
      const text = source.slice(0, end);
      const streaming = index < ends.length - 1;
      await show(text, streaming);
      if (streaming && index > 0) carets.add(caret());
      if (actedAt < 0 && text.includes(marker)) {
        const button = container.querySelector(".bench-counter");
        const tab = container.querySelectorAll(".ct-tab")[1];
        if (!button || !tab) continue;
        button.click();
        await frame();
        button.click();
        tab.click();
        await frame();
        actedAt = index;
      }
    }
    await frame();
    await frame();
    return {
      updates: ends.length,
      actedAt,
      carets: [...carets],
      counter: container.querySelector(".bench-counter")?.textContent ?? null,
      selectedTab: container.querySelector('.ct-tab[aria-selected="true"]')?.textContent ?? null,
      html: container.innerHTML,
    };
  },
};
