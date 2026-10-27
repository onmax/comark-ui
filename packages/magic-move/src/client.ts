declare global {
  interface Window {
    __comarkMagicMove?: { users: number; stop: () => void };
  }
}

/**
 * Starts the arrows and keys of every `.cmv` block on the page and returns a function that stops them. Every caller
 * shares one set of listeners, which stop with the last caller. The function is self-contained: the HTML renderer
 * inlines its source as a script, so it must not use anything from outside its body.
 */
export function start(css: string): () => void {
  const running = window.__comarkMagicMove;
  if (running) {
    running.users++;
    return running.stop;
  }
  const listeners = new AbortController();
  const signal = listeners.signal;
  // The page may already carry the styles: the HTML renderer inlines them, and apps can import style.css.
  const style = document.querySelector("style[data-comark-magic-move],link[data-comark-magic-move]")
    ? null
    : document.createElement("style");
  if (style) {
    style.setAttribute("data-comark-magic-move", "");
    style.textContent = css;
    document.head.append(style);
  }
  document.documentElement.setAttribute("data-magic-move-ready", "");

  const duration = 500;
  const easing = "cubic-bezier(.22,1,.36,1)";
  const stepsOf = (root: Element) => [
    ...root.querySelectorAll<HTMLElement>(":scope>.cmv-stage>.cmv-step"),
  ];
  const currentOf = (steps: HTMLElement[]) =>
    Math.max(
      0,
      steps.findIndex((step) => !step.hasAttribute("data-inactive")),
    );

  // A word, or one mark of punctuation: the pieces that move on their own. Shiki's spans hold several, with the spaces
  // around them, so the script cuts its own whatever highlighted the code.
  const piece = /[\p{L}\p{N}_$]+|\S/gu;
  const split = new WeakMap<Element, HTMLElement[]>();
  // Wraps each piece of the step's code in a span once, on the first move, so a page that never moves keeps its markup.
  function tokensOf(step: HTMLElement) {
    const known = split.get(step);
    if (known) return known;
    const tokens: HTMLElement[] = [];
    const code = step.querySelector("pre");
    const walker = code && document.createTreeWalker(code, NodeFilter.SHOW_TEXT);
    const texts: Text[] = [];
    while (walker?.nextNode())
      if (walker.currentNode instanceof Text) texts.push(walker.currentNode);
    for (const node of texts) {
      const value = node.data;
      if (!value.trim()) continue;
      const parts = document.createDocumentFragment();
      let at = 0;
      for (const match of value.matchAll(piece)) {
        if (match.index > at) parts.append(value.slice(at, match.index));
        const token = document.createElement("span");
        token.className = "cmv-t";
        token.textContent = match[0];
        parts.append(token);
        tokens.push(token);
        at = match.index + match[0].length;
      }
      if (at < value.length) parts.append(value.slice(at));
      node.replaceWith(parts);
    }
    split.set(step, tokens);
    return tokens;
  }

  // The pieces two steps share, in order: a longest common subsequence of their text. Past the budget, nothing pairs and
  // the steps cross-fade.
  function pairs(a: string[], b: string[]) {
    const width = b.length + 1;
    if (a.length * b.length > 1_000_000) return [];
    const table = new Uint16Array((a.length + 1) * width);
    for (let i = a.length - 1; i >= 0; i--)
      for (let j = b.length - 1; j >= 0; j--)
        table[i * width + j] =
          a[i] === b[j]
            ? table[(i + 1) * width + j + 1]! + 1
            : Math.max(table[(i + 1) * width + j]!, table[i * width + j + 1]!);
    const result: [number, number][] = [];
    let i = 0;
    let j = 0;
    while (i < a.length && j < b.length) {
      if (a[i] === b[j]) result.push([i++, j++]);
      else if (table[(i + 1) * width + j]! >= table[i * width + j + 1]!) i++;
      else j++;
    }
    return result;
  }

  function sync(root: Element, index: number, count: number) {
    const text = `${index + 1} / ${count}`;
    const counter = root.querySelector(":scope>.cmv-controls .cmv-count");
    // Only on a change: the counter is a live region, so each write is read out.
    if (counter && counter.textContent !== text) counter.textContent = text;
    for (const button of root.querySelectorAll(":scope>.cmv-controls [data-magic-move-step]")) {
      const by = Number(button.getAttribute("data-magic-move-step"));
      button.setAttribute("aria-disabled", String(by < 0 ? index === 0 : index === count - 1));
    }
  }

  // FLIP: measure every piece, switch steps, measure again, then play each shared piece from where it was. Pieces only
  // in the new step fade in, and those only in the old one fade out where they stood, as copies over the stage.
  function show(root: Element, to: number) {
    const stage = root.querySelector<HTMLElement>(":scope>.cmv-stage");
    const steps = stepsOf(root);
    const from = steps[currentOf(steps)];
    const target = steps[to];
    if (!stage || !from || !target || from === target) return;
    for (const animation of stage.getAnimations({ subtree: true })) animation.finish();
    for (const ghost of stage.querySelectorAll(":scope>.cmv-ghost")) ghost.remove();
    const moving = !matchMedia("(prefers-reduced-motion: reduce)").matches;
    const before = moving ? tokensOf(from) : [];
    const after = moving ? tokensOf(target) : [];
    const box = stage.getBoundingClientRect();
    const first = before.map((token) => token.getBoundingClientRect());
    const looks = before.map((token) => {
      const { color, fontFamily, fontSize, fontStyle, fontWeight } = getComputedStyle(token);
      return { color, fontFamily, fontSize, fontStyle, fontWeight };
    });
    from.setAttribute("data-inactive", "");
    target.removeAttribute("data-inactive");
    sync(root, to, steps.length);
    if (!moving) return;

    const matched = pairs(
      before.map((token) => token.textContent ?? ""),
      after.map((token) => token.textContent ?? ""),
    );
    const kept = new Set(matched.map(([i]) => i));
    const placed = new Set(matched.map(([, j]) => j));
    for (const [i, j] of matched) {
      const token = after[j]!;
      const last = token.getBoundingClientRect();
      const dx = first[i]!.left - last.left;
      const dy = first[i]!.top - last.top;
      const { color } = getComputedStyle(token);
      if (dx || dy || looks[i]!.color !== color)
        token.animate(
          { transform: [`translate(${dx}px,${dy}px)`, "none"], color: [looks[i]!.color, color] },
          { duration, easing },
        );
    }
    for (const [j, token] of after.entries())
      if (!placed.has(j))
        token.animate(
          { opacity: [0, 1] },
          { duration: duration / 2, delay: duration / 2, easing: "ease-out", fill: "backwards" },
        );
    for (const [i, token] of before.entries()) {
      if (kept.has(i)) continue;
      const ghost = document.createElement("span");
      ghost.className = "cmv-ghost";
      ghost.textContent = token.textContent;
      Object.assign(ghost.style, looks[i], {
        left: `${first[i]!.left - box.left}px`,
        top: `${first[i]!.top - box.top}px`,
      });
      stage.append(ghost);
      const remove = () => ghost.remove();
      ghost
        .animate(
          { opacity: [1, 0] },
          { duration: duration / 2, easing: "ease-in", fill: "forwards" },
        )
        .finished.then(remove, remove);
    }
    const height = stage.getBoundingClientRect().height;
    if (height !== box.height) {
      stage.setAttribute("data-moving", "");
      const done = () => stage.removeAttribute("data-moving");
      stage
        .animate({ height: [`${box.height}px`, `${height}px`] }, { duration, easing })
        .finished.then(done, done);
    }
  }

  const page = (root: Element, by: number) => {
    const steps = stepsOf(root);
    const to = currentOf(steps) + by;
    if (to >= 0 && to < steps.length) show(root, to);
  };

  const buttonOf = (event: Event) =>
    event.target instanceof Element
      ? event.target.closest<HTMLElement>(".cmv>.cmv-controls [data-magic-move-step]")
      : null;
  const rootOf = (element: Element) => element.closest(".cmv");

  document.addEventListener(
    "click",
    (event) => {
      const button = buttonOf(event);
      const root = button && rootOf(button);
      if (root) page(root, Number(button.getAttribute("data-magic-move-step")));
    },
    { signal },
  );

  // The arrow keys page from either button, in the reading direction.
  document.addEventListener(
    "keydown",
    (event) => {
      const button = buttonOf(event);
      const root = button && rootOf(button);
      if (!root || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
      const back = getComputedStyle(root).direction === "rtl" ? "ArrowRight" : "ArrowLeft";
      const forward = back === "ArrowLeft" ? "ArrowRight" : "ArrowLeft";
      const by = event.key === forward ? 1 : event.key === back ? -1 : 0;
      if (!by) return;
      event.preventDefault();
      page(root, by);
    },
    { signal },
  );

  const state = {
    users: 1,
    stop: () => {
      if (--state.users > 0) return;
      listeners.abort();
      style?.remove();
      document.documentElement.removeAttribute("data-magic-move-ready");
      window.__comarkMagicMove = undefined;
    },
  };
  window.__comarkMagicMove = state;
  return state.stop;
}

export { css } from "./styles.ts";
