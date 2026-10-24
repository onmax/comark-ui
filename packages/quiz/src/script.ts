import type { Icons } from "./icons.ts";
import type { QuizLabels } from "./labels.ts";

/** One answer, as a host stores it and sends it back. */
export type QuizAnswer = { choice: string[]; correct?: boolean | null };

/** What a host sends with `comark-quiz:state` on `document`, or passes to `window.__comarkQuiz.apply()`. */
export type QuizState = {
  answers?: Record<string, QuizAnswer>;
  results?: Record<string, { counts: Record<string, number>; total: number }>;
  voting?: { open: boolean; notice?: string };
};

/** The detail of `comark-quiz:answer`, which bubbles from the block and crosses shadow roots. */
export type QuizAnswerDetail = {
  id: string;
  kind: "question" | "poll" | "recall";
  /** Option keys; for a recall card `["revealed"]`, `["knew"]`, or `["missed"]`. */
  choice: string[];
  correct: boolean | null;
  /** Whether it's the first answer to this block on this page view. */
  first: boolean;
};

/** The detail of `comark-quiz:ready`, fired on `document` with the ids of the blocks on the page. */
export type QuizReadyDetail = { ids: string[] };

declare global {
  interface Window {
    __comarkQuiz?: { apply: (state: QuizState) => void; ids: () => string[] };
  }
}

export type ScriptConfig = { labels: QuizLabels; icons: Icons };

/**
 * Upgrades every `.cqz` block on the page, and any added later, from its no-script form into the interactive one,
 * keeps its state, fires `comark-quiz:answer`, and applies what a host sends. It runs once per page however many
 * documents inline it. The function is self-contained: the HTML renderer inlines its source as a script, so it must
 * not use anything from outside its body.
 */
export function script(config: ScriptConfig): void {
  if (window.__comarkQuiz) return;
  type Kind = "question" | "poll" | "recall";
  type Model = {
    kind: Kind;
    id: string;
    el: HTMLElement;
    labels: QuizLabels;
    options: HTMLElement[];
    inputs: HTMLInputElement[];
    keys: string[];
    correct: Set<string>;
    multiple: boolean;
    selected: Set<string>;
    result: "correct" | "incorrect" | "revealed" | null;
    checked: string[];
    vote: string[] | null;
    changing: boolean;
    closes: number;
    revealed: boolean;
    grade: "knew" | "missed" | null;
    // Check was pressed with nothing selected.
    prompted: boolean;
    // The reader answered on this page view, so changes may move; restored ones never do.
    live: boolean;
    // Its answer came from localStorage, which a host's state replaces.
    local: boolean;
    // The choice both sides last agreed on, so a host echoing it back doesn't undo a retry.
    sent: string;
  };

  const html = document.documentElement;
  html.setAttribute("data-quiz-ready", "");
  const { icons } = config;
  const models = new WeakMap<Element, Model>();
  const all: Model[] = [];
  const fired = new Set<string>();
  type Answer = { choice: string[]; correct: boolean | null };
  const results = new Map<string, { counts: Map<string, number>; total: number }>();
  const answers = new Map<string, Answer>();
  let voting = { open: true, notice: "" };
  let hosted = false;

  // A host's state and saved answers are parsed here, once, so nothing past this point trusts their shape.
  const entries = (value: unknown): [string, unknown][] =>
    value instanceof Object && !Array.isArray(value) ? Object.entries(value) : [];
  const str = (value: unknown) =>
    value === undefined || value === null || value instanceof Object
      ? ""
      : // SAFETY: undefined, null, objects, and arrays returned above, so only a string, number, or boolean is left.
        String(value as string | number | boolean);
  const amount = (value: unknown) => Math.max(0, Number(str(value)) || 0);
  function toAnswer(value: unknown): Answer {
    const fields = new Map(entries(value));
    const choice = fields.get("choice");
    const correct = fields.get("correct");
    return {
      choice: Array.isArray(choice) ? choice.map(str).filter(Boolean) : [],
      correct: correct === true || correct === false ? correct : null,
    };
  }

  const $ = <T extends Element = HTMLElement>(root: ParentNode, selector: string) =>
    root.querySelector<T>(selector);
  const $$ = <T extends Element = HTMLElement>(root: ParentNode, selector: string) => [
    ...root.querySelectorAll<T>(selector),
  ];
  const own = (model: Model, selector: string) =>
    $$(model.el, selector).filter((node) => node.closest(".cqz") === model.el);
  const part = (model: Model, selector: string) => own(model, selector)[0];
  // An answer as one string, to tell whether a host's copy differs from the one shown. An empty choice with `correct`
  // false is a question whose answer was shown; any other empty choice is no answer.
  const signature = (answer: Answer) =>
    answer.choice.length
      ? answer.choice.toSorted().join("\n")
      : answer.correct === false
        ? "\n"
        : "";
  const count = (template: string, n: number) => {
    let shown = String(n);
    try {
      shown = n.toLocaleString(html.lang || undefined);
    } catch {}
    return template.replace("{count}", shown);
  };

  // Storage can throw in a sandboxed frame or with cookies blocked, and may forget on reload; the blocks work either way.
  const storageKey = (id: string) => `comark-quiz:${location.pathname}:${id}`;
  function save(id: string, answer: Answer) {
    if (hosted) return;
    try {
      localStorage.setItem(storageKey(id), JSON.stringify(answer));
    } catch {}
  }
  function load(id: string): Answer | undefined {
    try {
      const saved = localStorage.getItem(storageKey(id));
      return saved ? toAnswer(JSON.parse(saved)) : undefined;
    } catch {
      return undefined;
    }
  }

  function setBool(el: Element | undefined, name: string, on: boolean) {
    if (el) el.toggleAttribute(name, on);
  }

  function paintQuestion(model: Model) {
    const { labels, result } = model;
    model.el.dataset.state = result ?? (model.selected.size ? "selected" : "idle");
    // The status line says the verdict; a row only says what it is: the reader's wrong pick, or a right option they
    // didn't pick once the answer is shown. A right pick wears its icon and tint alone.
    for (const [at, option] of model.options.entries()) {
      const key = model.keys[at] ?? "";
      const input = model.inputs[at];
      const chosen = result ? model.checked.includes(key) : model.selected.has(key);
      const right = model.correct.has(key);
      let state = chosen ? "selected" : "idle";
      let label = "";
      if (result && chosen)
        [state, label] = right ? ["correct", ""] : ["incorrect", labels.yourAnswer];
      else if (result === "revealed" && right) [state, label] = ["revealed", labels.correctAnswer];
      else if (result) state = "idle";
      option.dataset.state = state;
      const word = $(option, ".cqz-verdict");
      if (word) word.textContent = label;
      const why = $(option, ".cqz-rationale");
      const shown = result === "revealed" || (result !== null && chosen);
      if (why) why.hidden = !shown;
      if (input) {
        input.checked = chosen;
        if (result) input.setAttribute("aria-disabled", "true");
        else input.removeAttribute("aria-disabled");
        if (why && shown) input.setAttribute("aria-describedby", why.id);
        else input.removeAttribute("aria-describedby");
      }
    }
    setBool(part(model, "[data-action='check']"), "hidden", result !== null);
    for (const action of ["retry", "reveal"])
      setBool(part(model, `[data-action='${action}']`), "hidden", result !== "incorrect");
    const done = result === "correct" || result === "revealed";
    setBool(part(model, ".cqz-explain"), "hidden", !done);
    // A hint can't help once the answer is out, unless the reader already has it open.
    const toggle = part(model, "[data-action='hint']");
    if (toggle) toggle.hidden = done && toggle.getAttribute("aria-expanded") !== "true";
    const total = paintResults(model, done, labels.answer, labels.answers);
    const right = model.options.flatMap((option, at) =>
      model.correct.has(model.keys[at] ?? "")
        ? [$(option, ".cqz-label")?.textContent?.trim() ?? ""]
        : [],
    );
    const said =
      result === "correct"
        ? labels.correct
        : result === "incorrect"
          ? labels.notQuite
          : result === null && model.prompted
            ? labels.selectAnswer
            : "";
    status(
      model,
      result === "correct" ? icons.yes : result === "incorrect" ? icons.no : "",
      said,
      result === "revealed" ? `${labels.correctAnswer}: ${right.join("; ")}` : "",
      total,
    );
    const actions = part(model, ".cqz-actions");
    if (actions)
      setBool(actions, "data-empty", result === "revealed" && !total && toggle?.hidden !== false);
  }

  // Rewrites the status line only when its words change, so a screen reader hears each message once.
  function status(model: Model, icon: string, said: string, unseen: string, total: string) {
    const line = part(model, ".cqz-status");
    const message = [icon, said, unseen, total].join("\n");
    if (!line || line.dataset.message === message) return;
    line.dataset.message = message;
    line.replaceChildren();
    line.insertAdjacentHTML("beforeend", icon);
    for (const [text, name] of [
      [said, "cqz-said"],
      [unseen, "cqz-sr"],
      [total, "cqz-count"],
    ]) {
      if (!text) continue;
      const span = document.createElement("span");
      span.className = name ?? "";
      span.textContent = text;
      line.append(span);
    }
  }

  function paintPoll(model: Model) {
    const { labels } = model;
    const closed = model.closes <= Date.now() || !voting.open;
    const voted = model.vote !== null && !model.changing;
    const open = hosted && !closed && (!voted || model.multiple);
    model.el.dataset.state = closed ? "closed" : voted ? "voted" : "idle";
    setBool(model.el, "data-host", hosted);
    for (const [at, option] of model.options.entries()) {
      const key = model.keys[at] ?? "";
      const input = model.inputs[at];
      const mine = model.vote?.includes(key) ?? false;
      option.dataset.state = mine
        ? (voted || closed) && !model.changing
          ? "voted"
          : "selected"
        : "idle";
      if (!input) continue;
      input.checked = mine;
      input.disabled = !hosted;
      if (hosted && !open) input.setAttribute("aria-disabled", "true");
      else input.removeAttribute("aria-disabled");
    }
    setBool(
      part(model, "[data-action='change']"),
      "hidden",
      !(hosted && voted && !closed && !model.multiple),
    );
    const notice = part(model, ".cqz-notice");
    if (notice)
      notice.textContent = !hosted
        ? labels.noHost
        : closed
          ? voting.notice || labels.closed
          : voting.notice;
    paintResults(model, voted || closed, labels.vote, labels.votes);
  }

  function paintRecall(model: Model) {
    model.el.dataset.state = model.revealed ? "revealed" : "idle";
    if (model.grade) model.el.dataset.grade = model.grade;
    else delete model.el.dataset.grade;
    const answer = part(model, ".cqz-reveal");
    if (answer) {
      answer.setAttribute("aria-hidden", String(!model.revealed));
      answer.inert = !model.revealed;
    }
    setBool(part(model, "[data-action='show']"), "hidden", model.revealed);
    for (const grade of ["knew", "missed"] as const) {
      const button = part(model, `[data-action='${grade}']`);
      if (!button) continue;
      button.hidden = !model.revealed;
      button.setAttribute("aria-pressed", String(model.grade === grade));
    }
  }

  function paintResults(model: Model, visible: boolean, one: string, many: string): string {
    const data = results.get(model.id);
    const shown = visible && data !== undefined;
    setBool(model.el, "data-results", shown);
    const total = data?.total ?? 0;
    const value = (key: string) => data?.counts.get(key) ?? 0;
    const most = Math.max(0, ...model.keys.map(value));
    for (const [at, option] of model.options.entries()) {
      const n = value(model.keys[at] ?? "");
      const share = shown && total ? Math.min(1, n / total) : 0;
      option.style.setProperty("--_cqz-share", String(share));
      setBool(option, "data-leading", shown && most > 0 && n === most);
      const percent = $(option, ".cqz-percent");
      if (percent) percent.textContent = shown ? `${Math.round(share * 100)}%` : "";
    }
    const words = shown ? count(total === 1 ? one : many, total) : "";
    const sum = part(model, ".cqz-total");
    if (sum) sum.textContent = words;
    return words;
  }

  function paint(model: Model, instant: boolean) {
    if (instant) model.el.setAttribute("data-instant", "");
    if (model.kind === "question") paintQuestion(model);
    else if (model.kind === "poll") paintPoll(model);
    else paintRecall(model);
    if (instant) {
      // The new styles land while transitions are off, so nothing moves when they come back.
      void model.el.offsetWidth;
      model.el.removeAttribute("data-instant");
    }
  }

  function reset(model: Model) {
    model.result = null;
    model.checked = [];
    model.selected = new Set();
    model.vote = null;
    model.changing = false;
    model.revealed = false;
    model.grade = null;
    model.sent = "";
  }

  function restore(model: Model, answer: Answer) {
    reset(model);
    const { choice } = answer;
    model.sent = signature(answer);
    if (model.kind === "recall") {
      const [first] = choice;
      model.revealed = first === "revealed" || first === "knew" || first === "missed";
      model.grade = first === "knew" || first === "missed" ? first : null;
      return;
    }
    const keys = choice.filter((key) => model.keys.includes(key));
    if (model.kind === "poll") {
      model.vote = keys.length ? keys : null;
      return;
    }
    if (!choice.length) {
      if (answer.correct === false) model.result = "revealed";
      return;
    }
    if (!keys.length) return;
    model.checked = keys;
    model.selected = new Set(keys);
    model.result =
      keys.length === model.correct.size && keys.every((key) => model.correct.has(key))
        ? "correct"
        : "incorrect";
  }

  function announce(model: Model, choice: string[], correct: boolean | null) {
    model.live = true;
    model.local = false;
    model.sent = signature({ choice, correct });
    const detail: QuizAnswerDetail = {
      id: model.id,
      kind: model.kind,
      choice,
      correct,
      first: !fired.has(model.id),
    };
    fired.add(model.id);
    save(model.id, { choice, correct });
    model.el.dispatchEvent(
      new CustomEvent("comark-quiz:answer", { bubbles: true, composed: true, detail }),
    );
  }

  // The no-script form keeps the rationales, the explanation, and the answer in a `<details>`; they move to where the
  // interactive form shows them, so each renders once.
  function upgrade(model: Model) {
    const { el } = model;
    for (const indicator of own(model, ".cqz-indicator"))
      indicator.insertAdjacentHTML("beforeend", icons.yes + icons.no);
    for (const why of own(model, ".cqz-key .cqz-rationale")) {
      const option = model.options[model.keys.indexOf(why.dataset.for ?? "")];
      if (!option) continue;
      why.hidden = true;
      option.append(why);
    }
    const actions = part(model, ".cqz-actions");
    const later = [part(model, ".cqz-hint"), part(model, ".cqz-explain")];
    for (const node of later.toReversed())
      if (node && actions) {
        node.hidden = true;
        actions.after(node);
      }
    const answer = part(model, ".cqz-answer");
    const reveal = part(model, ".cqz-reveal");
    if (answer && reveal) reveal.append(answer);
    for (const disclosure of own(model, ".cqz-disclosure")) disclosure.remove();
    for (const button of own(model, "[data-action='knew'],[data-action='missed']"))
      button.insertAdjacentHTML("afterbegin", icons.check);
    el.setAttribute("data-upgraded", "");
  }

  const fresh: string[] = [];
  let announced = false;
  let queued = false;
  function flush() {
    queued = false;
    if (!announced || !fresh.length) return;
    const detail: QuizReadyDetail = { ids: fresh.splice(0) };
    document.dispatchEvent(new CustomEvent("comark-quiz:ready", { detail }));
  }
  const later = () => {
    if (queued) return;
    queued = true;
    queueMicrotask(flush);
  };

  function setup(el: HTMLElement) {
    const kind = el.dataset.quizKind;
    const id = el.dataset.quizId;
    if (models.has(el) || !id || (kind !== "question" && kind !== "poll" && kind !== "recall"))
      return;
    // While the page loads, the parser may have added the block but not all of its parts; its end marker comes last.
    // Renderers that do not emit the end marker can still append a complete root in one operation.
    // Streamed roots remain deferred until their marker (or until all interactive parts are present).
    const optionRows = el.querySelectorAll(":scope>.cqz-options>.cqz-option").length;
    const complete =
      kind === "poll"
        ? optionRows > 0 && !!el.querySelector(":scope>.cqz-footer")
        : kind === "recall"
          ? !!el.querySelector(":scope>.cqz-actions") &&
            !!el.querySelector(":scope>.cqz-disclosure .cqz-answer")
          : optionRows > 0 && !!el.querySelector(":scope>.cqz-actions");
    const marked = !!el.querySelector(":scope>template.cqz-end");
    // Markerless roots are only safe to read after the initial document has
    // settled. During parsing, a renderer may append their children in pieces.
    if (!marked && !announced) return;
    if (!marked && !complete) return;
    let written: unknown;
    try {
      written = JSON.parse(el.dataset.labels ?? "{}");
    } catch {}
    const labels = { ...config.labels };
    for (const [key, value] of entries(written))
      if (key in labels) Object.assign(labels, { [key]: str(value) });
    const model: Model = {
      kind,
      id,
      el,
      labels,
      options: [],
      inputs: [],
      keys: [],
      correct: new Set(),
      multiple: el.hasAttribute("data-multiple"),
      selected: new Set(),
      result: null,
      checked: [],
      vote: null,
      changing: false,
      closes: Date.parse(el.dataset.closes ?? "") || Infinity,
      revealed: false,
      grade: null,
      prompted: false,
      live: false,
      local: false,
      sent: "",
    };
    models.set(el, model);
    all.push(model);
    model.options = own(model, ".cqz-options>.cqz-option");
    model.keys = model.options.map((option) => option.dataset.key ?? "");
    model.inputs = model.options.map(
      (option) => $<HTMLInputElement>(option, ".cqz-input") ?? document.createElement("input"),
    );
    for (const option of model.options)
      if (option.hasAttribute("data-correct")) model.correct.add(option.dataset.key ?? "");
    upgrade(model);
    const answer = hosted ? answers.get(id) : load(id);
    if (answer) {
      restore(model, answer);
      model.local = !hosted;
    }
    paint(model, true);
    fresh.push(id);
    later();
  }

  const scan = (node: ParentNode) => {
    if (node instanceof HTMLElement && node.matches(".cqz[data-quiz-id]")) setup(node);
    for (const el of $$(node, ".cqz[data-quiz-id]")) setup(el);
  };
  scan(document);
  const pending = new Set<HTMLElement>();
  let pendingTimer = 0;
  const deferScan = (root: HTMLElement) => {
    pending.add(root);
    if (pendingTimer) return;
    pendingTimer = window.setTimeout(() => {
      pendingTimer = 0;
      for (const el of pending) if (el.isConnected) setup(el);
      pending.clear();
    }, 0);
  };
  // The renderer inlines the script after the first block, so the page's later blocks arrive after it.
  new MutationObserver((records) => {
    for (const record of records)
      for (const node of record.addedNodes) {
        if (!(node instanceof Element)) continue;
        // SAFETY: the selector branches return the quiz root element or null.
        const root = (
          node.matches(".cqz[data-quiz-id]")
            ? node
            : (node.closest(".cqz[data-quiz-id]") ??
              node.parentElement?.closest(".cqz[data-quiz-id]"))
        ) as HTMLElement | null;
        if (root) deferScan(root);
        else scan(node.parentElement ?? node);
      }
  }).observe(html, { childList: true, subtree: true });
  const ready = () => {
    // Blocks from a renderer without the end marker wait until here.
    announced = true;
    scan(document);
    flush();
  };
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", ready, { once: true });
  else queueMicrotask(ready);

  function apply(state: unknown) {
    if (!(state instanceof Object)) return;
    const fields = new Map(entries(state));
    const first = !hosted;
    hosted = true;
    if (fields.get("voting") instanceof Object) {
      const said = new Map(entries(fields.get("voting")));
      voting = { open: said.get("open") !== false, notice: str(said.get("notice")) };
    }
    for (const [id, value] of entries(fields.get("results"))) {
      const result = new Map(entries(value));
      results.set(id, {
        counts: new Map(entries(result.get("counts")).map(([key, n]) => [key, amount(n)])),
        total: amount(result.get("total")),
      });
    }
    const sent = new Map(
      entries(fields.get("answers")).map(([id, value]) => [id, toAnswer(value)]),
    );
    for (const [id, answer] of sent) answers.set(id, answer);
    for (const model of all) {
      if (!model.el.isConnected) continue;
      const answer = sent.get(model.id);
      let instant = !model.live;
      if (answer && signature(answer) !== model.sent) {
        restore(model, answer);
        instant = true;
      } else if (first && model.local) {
        reset(model);
        instant = true;
      }
      model.local = false;
      paint(model, instant);
    }
  }

  const modelOf = (node: EventTarget | null) => {
    const el = node instanceof Element ? node.closest(".cqz") : null;
    return el ? models.get(el) : undefined;
  };
  const inputOf = (node: EventTarget | null) =>
    node instanceof HTMLInputElement && node.classList.contains("cqz-input") ? node : null;
  const focus = (node: HTMLElement | undefined) => node?.focus();

  function check(model: Model) {
    if (model.result) return;
    if (!model.selected.size) {
      model.prompted = true;
      paint(model, false);
      return;
    }
    model.prompted = false;
    model.checked = model.keys.filter((key) => model.selected.has(key));
    const right =
      model.checked.length === model.correct.size &&
      model.checked.every((key) => model.correct.has(key));
    model.result = right ? "correct" : "incorrect";
    paint(model, false);
    announce(model, model.checked, right);
    focus(
      right
        ? model.inputs[model.keys.indexOf(model.checked[0] ?? "")]
        : part(model, "[data-action='retry']"),
    );
  }

  function act(model: Model, action: string, button: HTMLElement) {
    if (action === "check") check(model);
    else if (action === "retry") {
      model.result = null;
      model.checked = [];
      model.selected = new Set();
      paint(model, false);
      focus(model.inputs[0]);
    } else if (action === "reveal") {
      model.result = "revealed";
      paint(model, false);
      announce(model, [], false);
      focus(model.inputs[model.keys.findIndex((key) => model.correct.has(key))]);
    } else if (action === "hint") {
      const open = button.getAttribute("aria-expanded") !== "true";
      button.setAttribute("aria-expanded", String(open));
      setBool(part(model, ".cqz-hint"), "hidden", !open);
    } else if (action === "change") {
      model.changing = true;
      paint(model, false);
      focus(model.inputs.find((input) => input.checked) ?? model.inputs[0]);
    } else if (action === "show") {
      model.revealed = true;
      paint(model, false);
      announce(model, ["revealed"], null);
      focus(part(model, ".cqz-reveal"));
    } else if (action === "knew" || action === "missed") {
      model.grade = action;
      paint(model, false);
      announce(model, [action], action === "knew");
    }
  }

  function vote(model: Model) {
    const choice = model.keys.filter((_, at) => model.inputs[at]?.checked);
    model.vote = choice.length ? choice : null;
    model.changing = false;
    paint(model, false);
    announce(model, choice, null);
  }

  document.addEventListener("click", (event) => {
    const input = inputOf(event.target);
    const model = modelOf(event.target);
    if (!model) return;
    if (input) {
      if (input.getAttribute("aria-disabled") === "true") event.preventDefault();
      else if (model.kind === "poll" && !input.disabled) vote(model);
      return;
    }
    const button =
      event.target instanceof Element
        ? event.target.closest<HTMLElement>(".cqz-button[data-action]")
        : null;
    if (button && modelOf(button) === model) act(model, button.dataset.action ?? "", button);
  });

  document.addEventListener("change", (event) => {
    const input = inputOf(event.target);
    const model = modelOf(input);
    if (!input || !model || model.kind !== "question" || model.result) return;
    model.selected = new Set(model.keys.filter((_, at) => model.inputs[at]?.checked));
    model.prompted = false;
    paint(model, false);
  });

  // Arrow keys would pick another radio, and so cast a vote or change an answer that's locked, so in a poll and in a
  // locked group they only move focus. Enter checks a question's answer or casts a vote.
  document.addEventListener("keydown", (event) => {
    const input = inputOf(event.target);
    const model = modelOf(input);
    if (!input || !model || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === "Enter") {
      event.preventDefault();
      if (model.kind === "question") check(model);
      else if (input.getAttribute("aria-disabled") !== "true") input.click();
      return;
    }
    const locked = input.getAttribute("aria-disabled") === "true";
    if (!locked && !(model.kind === "poll" && input.type === "radio")) return;
    const back = getComputedStyle(input).direction === "rtl" ? "ArrowRight" : "ArrowLeft";
    const step =
      event.key === "ArrowDown" || event.key === (back === "ArrowLeft" ? "ArrowRight" : "ArrowLeft")
        ? 1
        : event.key === "ArrowUp" || event.key === back
          ? -1
          : 0;
    if (!step) return;
    event.preventDefault();
    const at = model.inputs.indexOf(input);
    focus(model.inputs[(at + step + model.inputs.length) % model.inputs.length]);
  });

  document.addEventListener("comark-quiz:state", (event) => {
    if (event instanceof CustomEvent) apply(event.detail);
  });

  window.__comarkQuiz = {
    apply,
    ids: () => all.flatMap((model) => (model.el.isConnected ? [model.id] : [])),
  };
}
