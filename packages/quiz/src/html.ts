import type { ElementNode, NodeHandler, State } from "comark";
import { escapeHtml } from "comark/utils";
import { icons, marks } from "./icons.ts";
import { DEFAULT_LABELS, type QuizLabels } from "./labels.ts";
import { childrenOf, isElement } from "../../../shared/nodes.ts";
import type { Kind } from "./read.ts";
import { script } from "./script.ts";
import { css } from "./styles.ts";
import { attr } from "../../../shared/html.ts";

export { default, DEFAULT_LABELS } from "./index.ts";
export type { QuizLabels, QuizMeta, QuizOptions } from "./index.ts";
export type { QuizAnswer, QuizAnswerDetail, QuizReadyDetail, QuizState } from "./script.ts";

// Each render gets a fresh `state.context`, so a document carries the styles and the script once.
const started = new WeakSet<object>();

/** The styles and the quiz script, inline, once per render. */
export function runtime(state: State): string {
  if (started.has(state.context)) return "";
  started.add(state.context);
  // `<` is escaped, so no label can close the script early.
  const config = JSON.stringify({ labels: DEFAULT_LABELS, icons }).replaceAll("<", "\\u003c");
  return `<style data-comark-quiz>${css}</style><script>(${script.toString()})(${config})</script>`;
}

const partOf = (node: ElementNode, tag: string) =>
  childrenOf(node).find((child): child is ElementNode => isElement(child) && child[0] === tag);
const optionsOf = (node: ElementNode) =>
  childrenOf(partOf(node, "quiz-options") ?? ["", {}]).filter(
    (child): child is ElementNode => isElement(child) && child[0] === "quiz-option",
  );
// Comark restores shared render state after each node, so parts render one at a time to keep the output deterministic.
async function each<T>(items: T[], render: (item: T) => Promise<string>) {
  let html = "";
  for (const item of items) html += await render(item);
  return html;
}
// The last child of every block. The parser may hand a long page to the browser in pieces, so the script waits for it
// before it reads a block.
const END = '<template class="cqz-end"></template>';
const button = (action: string, variant: string, label: string, extra = "") =>
  `<button type="button" class="cqz-button" data-variant="${variant}" data-action="${action}"${extra}>${label}</button>`;

async function render(node: ElementNode, state: State) {
  const [tag, attrs] = node;
  // SAFETY: only `question`, `poll`, and `recall` map to this handler.
  const kind = tag as Kind;
  // SAFETY: the parse plugin writes `labels` as the `labels` option, an object of strings.
  const extra = (attrs.labels ?? undefined) as Partial<QuizLabels> | undefined;
  const labels = { ...DEFAULT_LABELS, ...extra };
  const text = (key: keyof QuizLabels) => escapeHtml(labels[key]);
  const uid = attr(attrs.uid);
  const flow = async (part: ElementNode | undefined) => (part ? state.flow(part, state) : "");
  const number = attrs.number
    ? `<span class="cqz-number" data-slot="number" id="${uid}-number">${attr(attrs.number)}.</span>`
    : "";
  const head = `<div class="cqz-head" data-slot="header">${number}<div class="cqz-prompt" data-slot="prompt" id="${uid}-prompt">${await flow(partOf(node, "quiz-prompt"))}</div></div>`;
  const labelledBy = `${number ? `${uid}-number ` : ""}${uid}-prompt`;
  const multiple = attrs.multiple === "true";
  // SAFETY: the parse plugin writes `closes` only as a string that parses as a date.
  const closes = attrs.closes === undefined ? "" : String(attrs.closes as string);
  const closed = kind === "poll" && closes !== "" && Date.parse(closes) <= Date.now();
  const options = optionsOf(node);
  const root = [
    `class="cqz${attrs.class ? ` ${attr(attrs.class)}` : ""}"`,
    'data-slot="root"',
    `data-quiz-id="${attr(attrs["quiz-id"])}"`,
    `data-quiz-kind="${kind}"`,
    `data-state="${closed ? "closed" : "idle"}"`,
    multiple ? "data-multiple" : "",
    closes ? `data-closes="${attr(closes)}"` : "",
    extra ? `data-labels="${attr(JSON.stringify(extra))}"` : "",
  ]
    .filter(Boolean)
    .join(" ");

  if (kind === "recall") {
    const answer = partOf(node, "quiz-answer");
    return (
      `<div ${root}>${head}` +
      (answer
        ? `<div class="cqz-reveal" data-slot="reveal" id="${uid}-answer" tabindex="-1"></div>` +
          `<div class="cqz-actions" data-slot="actions">${button("show", "outline", text("showAnswer"), ` aria-controls="${uid}-answer"`)}${button("knew", "ghost", text("knewIt"), ' aria-pressed="false" hidden')}${button("missed", "ghost", text("notYet"), ' aria-pressed="false" hidden')}<div class="cqz-status cqz-sr" data-slot="status" role="status"></div></div>` +
          `<details class="cqz-disclosure" data-slot="disclosure"><summary class="cqz-button" data-variant="outline">${text("showAnswer")}</summary><div class="cqz-answer" data-slot="answer">${await flow(answer)}</div></details>`
        : "") +
      `${END}</div>`
    );
  }

  const type = multiple ? "checkbox" : "radio";
  const rows = await each(options, async ([, option, ...parts]) => {
    const key = attr(option.key);
    const label = parts.find(
      (part): part is ElementNode => isElement(part) && part[0] === "quiz-label",
    );
    return (
      `<div class="cqz-option" data-slot="option" data-key="${key}" data-state="idle"${option.correct === "true" ? " data-correct" : ""}>` +
      `<label class="cqz-choice"><span class="cqz-indicator" data-slot="indicator"><input class="cqz-input" type="${type}" name="${uid}" value="${key}"${kind === "poll" ? " disabled" : ""}>${marks[type]}</span>` +
      `<span class="cqz-label" data-slot="label">${await flow(label)}</span><span class="cqz-verdict" data-slot="verdict"></span><span class="cqz-percent" data-slot="percent"></span></label>` +
      `<span class="cqz-bar" data-slot="bar" aria-hidden="true"></span></div>`
    );
  });
  const list = `<fieldset class="cqz-options" data-slot="options" aria-labelledby="${labelledBy}">${rows}</fieldset>`;
  const after = partOf(node, "quiz-after");
  const tail = after ? `<div class="cqz-after" data-slot="after">${await flow(after)}</div>` : "";

  if (kind === "poll") {
    const notice = closed ? text("closed") : text("noHost");
    return (
      `<div ${root}>${head}${list}${tail}` +
      `<div class="cqz-footer" data-slot="footer"><span class="cqz-total" data-slot="total" role="status"></span>${button("change", "link", text("changeVote"), " hidden")}<span class="cqz-notice" data-slot="notice">${notice}</span></div>${END}</div>`
    );
  }

  // Without the script, the answer key sits in a `<details>`; the script moves each rationale and the explanation next
  // to where the interactive form reveals them. Its rows use `data-for`, so `data-key` and `data-correct` mark only
  // the options a host reads.
  const gradable = options.some(([, option]) => option.correct === "true");
  const hint = partOf(node, "quiz-hint");
  const explain = partOf(node, "quiz-explain");
  const key = await each(options, async ([, option, ...parts]) => {
    const label = parts.find(
      (part): part is ElementNode => isElement(part) && part[0] === "quiz-label",
    );
    const why = parts.find(
      (part): part is ElementNode => isElement(part) && part[0] === "quiz-rationale",
    );
    const right = option.correct === "true";
    return (
      `<div class="cqz-key-item" data-for="${attr(option.key)}">` +
      (right ? `<span class="cqz-key-verdict">${icons.yes}${text("correctAnswer")}</span>` : "") +
      `<div class="cqz-key-label">${await flow(label)}</div>` +
      (why
        ? `<div class="cqz-rationale" data-slot="rationale" data-for="${attr(option.key)}" id="${uid}-${attr(option.key)}">${await flow(why)}</div>`
        : "") +
      `${END}</div>`
    );
  });
  const hintHtml = hint
    ? `<div class="cqz-hint" data-slot="hint" id="${uid}-hint">${icons.hint}<div class="cqz-hint-body">${await flow(hint)}</div></div>`
    : "";
  const explainHtml = explain
    ? `<div class="cqz-explain" data-slot="explain">${await flow(explain)}</div>`
    : "";
  const actions = gradable
    ? `<div class="cqz-actions" data-slot="actions">${button("check", "default", text("check"))}${button("retry", "default", text("tryAgain"), " hidden")}${button("reveal", "outline", text("showAnswer"), " hidden")}<div class="cqz-status" data-slot="status" role="status"></div>${hint ? `<button type="button" class="cqz-button cqz-hint-toggle" data-variant="ghost" data-action="hint" aria-expanded="false" aria-controls="${uid}-hint">${icons.hint}${text("hint")}</button>` : ""}</div>`
    : "";
  return (
    `<div ${root}>${head}${list}${tail}${actions}` +
    (hint
      ? `<details class="cqz-disclosure" data-slot="disclosure"><summary class="cqz-button" data-variant="ghost">${icons.hint}${text("hint")}</summary>${hintHtml}</details>`
      : "") +
    (gradable
      ? `<details class="cqz-disclosure" data-slot="disclosure"><summary class="cqz-button" data-variant="outline">${text("showAnswer")}</summary><div class="cqz-key" data-slot="key">${key}</div>${explainHtml}</details>`
      : "") +
    `${END}</div>`
  );
}

// A block the plugin didn't read, such as one nested in another, renders its content plainly.
const quiz: NodeHandler = async (node, state) =>
  node[1]["quiz-id"] === undefined
    ? state.flow(node, state)
    : `${await render(node, state)}${runtime(state)}`;

/** The HTML renderer for `::question`, `::poll`, and `::recall`. Pass it as `components`; it inlines the styles and script once per document. */
export const components: Record<Kind, NodeHandler> = { question: quiz, poll: quiz, recall: quiz };
