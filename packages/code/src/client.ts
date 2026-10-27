import { toNativeAttributes } from "comark/utils";
import { iconStyle } from "comark-icon/client";

/**
 * One of your actions as the parse plugin writes it on a code block: an empty `label` shows only the icon, and `title`
 * is the tooltip and the icon-only button's name.
 */
export type ActionButton = {
  id: string;
  label: string;
  title: string;
  icon?: { src: string; ratio: number; mask: boolean };
};

/** What the `comark-code-action` event carries: the action's `id`, the block's code, and its language. */
export type CodeActionDetail = { action: string; code: string; language: string };

declare global {
  interface Window {
    __comarkCode?: { users: number; stop: () => void };
  }
  // The event bubbles from the block, so a listener anywhere above it gets a typed `detail`.
  interface HTMLElementEventMap {
    "comark-code-action": CustomEvent<CodeActionDetail>;
  }
  interface DocumentEventMap {
    "comark-code-action": CustomEvent<CodeActionDetail>;
  }
  interface WindowEventMap {
    "comark-code-action": CustomEvent<CodeActionDetail>;
  }
}

/**
 * The attributes a component's `pre` gets, written as Comark writes them on a `pre` of its own: a fence's `language`
 * and `filename` become `data-language` and `data-filename`.
 */
export function preAttributes<T extends Record<string, unknown>>(attributes: T): T {
  // Components get the attributes without their node, so an HTML `<pre language>`, which Comark leaves alone, is
  // treated as a fence too. Authors don't write those.
  return toNativeAttributes("pre", ["pre", {}], attributes);
}

// What the parse plugin writes on a block for the wrapper rather than the `pre`.
const own = new Set(["actions", "frame", "wrap", "lines", "numbers"]);

/** The block's attributes without the ones the parse plugin wrote for the wrapper. */
export const withoutOwn = <T extends Record<string, unknown>>(attributes: T): T =>
  // SAFETY: only keys are dropped, and the callers read the rest as the same record.
  Object.fromEntries(Object.entries(attributes).filter(([key]) => !own.has(key))) as T;

/**
 * Splits a block's attributes into the `.ck` wrapper's, the `pre`'s, and the header's markup, the same in every renderer:
 * the frame, Wrap's starting state, and line numbers go on the wrapper, where the styles and the script read them.
 */
export function parts(attributes: Record<string, unknown>): {
  wrapper: Record<string, string>;
  pre: Record<string, unknown>;
  bar: string;
} {
  return {
    wrapper: {
      class: "ck",
      ...(attributes.frame === "terminal" && { "data-code-frame": "terminal" }),
      ...(attributes.lines === true && { "data-code-lines": "" }),
      ...(Number(attributes.numbers) > 0 && {
        "data-code-numbers": `${Number(attributes.numbers)}`,
      }),
      ...(attributes.wrap === true && { "data-code-wrap": "" }),
    },
    pre: preAttributes(withoutOwn(attributes)),
    bar: buttons(attributes.actions, attributes),
  };
}

/**
 * Starts the buttons of every `.ck` code block on the page and returns a function that stops them. Every caller shares
 * one set of listeners, which stop with the last caller. The function is self-contained: the HTML renderer inlines its
 * source as a script, so it must not use anything from outside its body.
 */
export function start(css: string): () => void {
  const running = window.__comarkCode;
  if (running) {
    running.users++;
    return running.stop;
  }
  const listeners = new AbortController();
  const signal = listeners.signal;
  // The page may already carry the styles: the HTML renderer inlines them, and apps can import style.css.
  const style = document.querySelector("style[data-comark-code],link[data-comark-code]")
    ? null
    : document.createElement("style");
  if (style) {
    style.setAttribute("data-comark-code", "");
    style.textContent = css;
    document.head.append(style);
  }
  document.documentElement.setAttribute("data-code-ready", "");

  const wrapKey = "comark-code-wrap";
  let wrap: boolean | undefined;
  try {
    const saved = localStorage.getItem(wrapKey);
    if (saved !== null) wrap = saved === "true";
  } catch {
    // Storage can be unavailable in embedded documents.
  }
  const observed = new Set<Element>();
  const defaults = new WeakMap<Element, boolean>();
  let frame = 0;
  const refresh = () => {
    frame = 0;
    const blocks = [...document.querySelectorAll<HTMLElement>(".ck")].flatMap((root) => {
      const pre = root.querySelector<HTMLElement>(":scope>pre");
      const button = root.querySelector(":scope>.ck-bar>.ck-wrap");
      if (!defaults.has(root)) defaults.set(root, root.hasAttribute("data-code-wrap"));
      return pre && button ? [{ root, pre, button }] : [];
    });
    for (const pre of observed) {
      if (pre.isConnected) continue;
      resize.unobserve(pre);
      observed.delete(pre);
    }
    // Measure without wrapping so the reader can still turn it off after the overflow disappears.
    for (const { root, pre } of blocks) {
      root.removeAttribute("data-code-wrap");
      if (!observed.has(pre)) {
        resize.observe(pre);
        observed.add(pre);
      }
    }
    const overflowing = blocks.map(
      ({ pre }) => pre.clientWidth > 0 && pre.scrollWidth > pre.clientWidth,
    );
    blocks.forEach(({ root, button }, index) => {
      root.toggleAttribute("data-code-overflow", overflowing[index]);
      const enabled = wrap ?? defaults.get(root) ?? false;
      root.toggleAttribute("data-code-wrap", enabled);
      button.setAttribute("aria-pressed", String(enabled));
    });
  };
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(refresh);
  };
  const resize = new ResizeObserver(schedule);
  const mutations = new MutationObserver((records) => {
    const affectsCode = records.some(({ target, addedNodes, removedNodes }) => {
      const element = target instanceof Element ? target : target.parentElement;
      if (element?.closest(".ck")) return true;
      return [...addedNodes, ...removedNodes].some(
        (node) => node instanceof Element && (node.matches(".ck") || node.querySelector(".ck")),
      );
    });
    if (affectsCode) schedule();
  });
  mutations.observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
  });
  document.fonts.addEventListener("loadingdone", schedule, { signal });
  window.addEventListener(
    "storage",
    (event) => {
      if (event.key !== wrapKey && event.key !== null) return;
      wrap = event.newValue === null ? undefined : event.newValue === "true";
      schedule();
    },
    { signal },
  );
  schedule();

  const say = (root: Element, message: string, state: "done" | "failed") => {
    const button = root.querySelector(":scope>.ck-bar>.ck-copy");
    const status = root.querySelector(":scope>.ck-bar>.ck-status");
    if (!button || !status) return;
    button.setAttribute("data-state", state);
    status.textContent = message;
    setTimeout(
      () => {
        if (status.textContent !== message) return;
        button.removeAttribute("data-state");
        status.textContent = "";
      },
      state === "done" ? 1500 : 6000,
    );
  };

  // The code as it reads after the change: without the lines marked deleted or the collapsed ranges' summaries.
  const textOf = (code: Element) => {
    // SAFETY: a deep clone of an element is an element of the same kind.
    const copy = code.cloneNode(true) as Element;
    for (const skipped of copy.querySelectorAll(".ck-del,.diff.remove,.ck-fold>summary"))
      skipped.remove();
    return copy.textContent ?? "";
  };

  // Without clipboard access, on a page served over plain http or in a frame that isn't allowed it, the code is
  // selected instead, so the reader's own copy keys take it.
  function copy(root: Element, code: Element) {
    const text = textOf(code);
    const failed = () => {
      // Select the filtered text in a temporary control so the keyboard fallback
      // has the same contents as the Clipboard API path.
      const field = document.createElement("textarea");
      field.value = text;
      field.setAttribute("readonly", "");
      field.setAttribute("aria-hidden", "true");
      field.style.position = "fixed";
      field.style.inset = "-9999px auto auto -9999px";
      field.style.opacity = "0";
      document.body.append(field);
      field.select();
      document.addEventListener("copy", () => field.remove(), { once: true, signal });
      say(root, "Couldn't copy, so the code is selected. Press Ctrl+C or ⌘C.", "failed");
    };
    // SAFETY: `clipboard` is missing outside secure contexts, whatever the DOM types say.
    const clipboard = navigator.clipboard as Clipboard | undefined;
    if (!clipboard) failed();
    else clipboard.writeText(text).then(() => say(root, "Copied", "done"), failed);
  }

  document.addEventListener(
    "click",
    (event) => {
      const button =
        event.target instanceof Element
          ? event.target.closest<HTMLElement>(".ck>.ck-bar>button")
          : null;
      const root = button?.parentElement?.parentElement;
      const pre = root?.querySelector(":scope>pre");
      if (!button || !root || !pre) return;
      const code = pre.querySelector("code") ?? pre;
      if (button.classList.contains("ck-copy")) copy(root, code);
      else if (button.classList.contains("ck-wrap")) {
        wrap = !root.hasAttribute("data-code-wrap");
        try {
          localStorage.setItem(wrapKey, String(wrap));
        } catch {
          // Wrapping still works when the browser refuses to save the preference.
        }
        schedule();
      } else {
        const detail: CodeActionDetail = {
          action: button.getAttribute("data-code-action") ?? "",
          code: textOf(code),
          language: pre.getAttribute("data-language") ?? "",
        };
        root.dispatchEvent(new CustomEvent("comark-code-action", { bubbles: true, detail }));
      }
    },
    { signal },
  );

  const state = {
    users: 1,
    stop: () => {
      if (--state.users > 0) return;
      listeners.abort();
      cancelAnimationFrame(frame);
      resize.disconnect();
      mutations.disconnect();
      style?.remove();
      document.documentElement.removeAttribute("data-code-ready");
      window.__comarkCode = undefined;
    },
  };
  window.__comarkCode = state;
  return state.stop;
}

/**
 * Calls `callback` with the block's code and language whenever a button of the action `id` is clicked, on any code
 * block of the page, and returns a function that stops it. The parse plugin's `actions` put the buttons there.
 */
export function onCodeAction(id: string, callback: (detail: CodeActionDetail) => void): () => void {
  const listener = (event: CustomEvent<CodeActionDetail>) => {
    if (event.detail.action === id) callback(event.detail);
  };
  document.addEventListener("comark-code-action", listener);
  return () => document.removeEventListener("comark-code-action", listener);
}

const escape = (value: string) =>
  value.replace(
    /[&<>"]/g,
    (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char] ?? char,
  );

const icon = (name: string, path: string) =>
  `<svg class="ck-${name}" viewBox="0 0 24 24" aria-hidden="true">${path}</svg>`;

function action({ id, label, title, icon: image }: ActionButton) {
  const style = image
    ? Object.entries(iconStyle(image.src, image.ratio))
        .map(([property, value]) => `${property}:${value}`)
        .join(";")
    : "";
  const named = label
    ? title === label
      ? ""
      : ` title="${escape(title)}"`
    : ` aria-label="${escape(title)}" title="${escape(title)}"`;
  return (
    `<button type="button" class="ck-action" data-code-action="${escape(id)}"${named}>` +
    (image
      ? `<span class="ci"${image.mask ? " data-mask" : ""} aria-hidden="true" style="${escape(style)}"></span>`
      : "") +
    `${escape(label)}</button>`
  );
}

/**
 * The inside of a block's header, the same in every renderer: the file's name or the language, your actions, Wrap and
 * Copy, then the status line that says whether the copy worked. The buttons stay hidden until the script starts, since
 * nothing works without it.
 */
export function buttons(actions: unknown, attributes: Record<string, unknown> = {}): string {
  // A terminal's window needs no language to say it's a shell.
  const language = attributes.frame === "terminal" ? "" : attributes.language;
  // SAFETY: Comark writes a fence's filename and language as strings.
  const title = `${(attributes.filename || language || "") as string}`;
  const wrap = attributes.wrap === true;
  // SAFETY: the parse plugin is the only writer of `actions`, always as `ActionButton`s.
  const own = (Array.isArray(actions) ? (actions as ActionButton[]) : []).map(action);
  return (
    (title ? `<span class="ck-title">${escape(title)}</span>` : "") +
    own.join("") +
    `<button type="button" class="ck-wrap" aria-label="Wrap lines" aria-pressed="${wrap}" title="Wrap lines">` +
    icon(
      "wrap-icon",
      '<path d="m16 16-3 3 3 3"/><path d="M3 12h14.5a1 1 0 0 1 0 7H13"/><path d="M3 19h6"/><path d="M3 5h18"/>',
    ) +
    `</button><button type="button" class="ck-copy" aria-label="Copy code" title="Copy">` +
    icon(
      "copy-idle",
      '<rect x="8" y="8" width="14" height="14" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
    ) +
    icon("copy-done", '<path d="M20 6 9 17l-5-5"/>') +
    `</button><span class="ck-status" role="status"></span>`
  );
}

export { css } from "./styles.ts";
