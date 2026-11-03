// Self-contained because HTML renderers inline it alongside their runtime.
export function createCodeMotion(prefix: string, duration = 500) {
  const easing = "cubic-bezier(.22,1,.36,1)";
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
        token.className = `${prefix}-t`;
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

  const playing = new Map<HTMLElement, Animation[]>();

  // FLIP: measure every piece, switch steps, measure again, then play each shared piece from where it was. Pieces only
  // in the new step fade in, and those only in the old one fade out where they stood, as copies over the stage.
  function show(stage: HTMLElement, from: HTMLElement, target: HTMLElement, animate = true) {
    // Only this script's own animations settle: the code's or the page's may run forever, and finishing one throws.
    for (const animation of playing.get(stage) ?? []) animation.finish();
    // A finished animation's callbacks run later, so the old move's cleanup can't be left to undo this one's.
    stage.removeAttribute("data-moving");
    const owned: Animation[] = [];
    playing.set(stage, owned);
    for (const ghost of stage.querySelectorAll(`:scope>.${prefix}-ghost`)) ghost.remove();
    const moving = animate && !matchMedia("(prefers-reduced-motion: reduce)").matches;
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
    if (!moving) {
      playing.delete(stage);
      return;
    }

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
        owned.push(
          token.animate(
            { transform: [`translate(${dx}px,${dy}px)`, "none"], color: [looks[i]!.color, color] },
            { duration, easing },
          ),
        );
    }
    for (const [j, token] of after.entries())
      if (!placed.has(j))
        owned.push(
          token.animate(
            { opacity: [0, 1] },
            { duration: duration / 2, delay: duration / 2, easing: "ease-out", fill: "backwards" },
          ),
        );
    for (const [i, token] of before.entries()) {
      if (kept.has(i)) continue;
      const ghost = document.createElement("span");
      ghost.className = `${prefix}-ghost`;
      ghost.setAttribute("aria-hidden", "true");
      ghost.textContent = token.textContent;
      Object.assign(ghost.style, looks[i], {
        left: `${first[i]!.left - box.left}px`,
        top: `${first[i]!.top - box.top}px`,
      });
      stage.append(ghost);
      const remove = () => ghost.remove();
      const fade = ghost.animate(
        { opacity: [1, 0] },
        { duration: duration / 2, easing: "ease-in", fill: "forwards" },
      );
      owned.push(fade);
      fade.finished.then(remove, remove);
    }
    const height = stage.getBoundingClientRect().height;
    if (height !== box.height) {
      stage.setAttribute("data-moving", "");
      const grow = stage.animate(
        { height: [`${box.height}px`, `${height}px`] },
        { duration, easing },
      );
      owned.push(grow);
    }
    const done = () => {
      if (playing.get(stage) !== owned) return;
      playing.delete(stage);
      stage.removeAttribute("data-moving");
      for (const ghost of stage.querySelectorAll(`:scope>.${prefix}-ghost`)) ghost.remove();
    };
    Promise.all(owned.map((animation) => animation.finished)).then(done, done);
  }

  return {
    show,
    stop() {
      for (const [stage, animations] of playing) {
        for (const animation of animations) animation.cancel();
        stage.removeAttribute("data-moving");
        for (const ghost of stage.querySelectorAll(`:scope>.${prefix}-ghost`)) ghost.remove();
      }
      playing.clear();
    },
  };
}
