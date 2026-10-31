import type { ElementNode, Node } from "comark";
import { resolveAttributes } from "comark/render";
import { textContent } from "comark/utils";
import type { QuizLabels } from "./labels.ts";
import { hash, text } from "../../../shared/text.ts";
import { childrenOf, isElement } from "../../../shared/nodes.ts";

export type Kind = "question" | "poll" | "recall";

/** One problem: the comark-linter rule it falls under, and the sentence that names its block and the fix. */
export type Issue = { rule: `comark/quiz/${string}`; message: string };

/** What `:bound` props resolve against while parsing. */
export type Data = Parameters<typeof resolveAttributes>[1];

const KINDS: readonly string[] = ["question", "poll", "recall"];
const PROPS: Record<Kind, readonly string[]> = {
  question: ["id", "multiple", "number", "shuffle"],
  poll: ["id", "multiple", "closes"],
  recall: ["id", "number"],
};
const SLOTS: Record<Kind, readonly string[]> = {
  question: ["hint", "explain"],
  poll: [],
  recall: ["answer"],
};
// Comark's own attributes, which a host may style or test by, so they aren't reported.
const NATIVE = /^(?:id|class|style|data-.+|aria-.+)$/i;
// Names an author is likely to guess, and what to write instead.
const PROP_HINTS = new Map([
  ["multi", "Did you mean `multiple`?"],
  ["random", "Did you mean `shuffle`?"],
  ["closes-at", "Did you mean `closes`?"],
  ["deadline", "Did you mean `closes`?"],
  ["numbered", "Did you mean `number`?"],
]);
// Slots an author is likely to guess, and the ones they may have meant; the first a block has is suggested.
const SLOT_GUESSES = new Map([
  ["explanation", ["explain"]],
  ["why", ["explain"]],
  ["answer", ["explain"]],
  ["solution", ["answer", "explain"]],
  ["explain", ["answer"]],
  ["back", ["answer"]],
  ["hints", ["hint"]],
]);
// Six is about as many options as a reader holds in mind at once.
export const MAX_OPTIONS = 6;
// A slot marker that a missing blank line left inside a rationale or an option, where it's only text.
const SWALLOWED = /(?:^|\n)[ \t]*#(explain|hint|answer)\b/;
// Options that only mean something in the order written, which shuffling breaks.
const POSITIONAL = [
  /\b(?:all|none|both|neither)\s+of\s+(?:the\s+)?(?:above|below|these|those|others|preceding|following)\b/i,
  /\b(?:the\s+)?(?:above|preceding|previous|following|other)\s+(?:options|answers|choices|ones)\b/i,
  /\b(?:[Oo]ptions?|[Aa]nswers?|[Cc]hoices?)\s+(?:[A-F]|\d)\b/,
  /^\s*\(?[A-F]\)?\s*(?:,|and|&|or)\s*\(?[A-F]\)?\b/,
  /\b(?:first|second|third|last)\s+(?:two|three|options?|answers?|choices?)\b/i,
];

const isOn = (value: unknown) => value === true || value === "true" || value === "";
const isOff = (value: unknown) => value === false || value === "false";
const clip = (value: string) => {
  const words = value.trim().replace(/\s+/g, " ");
  return words.length > 40 ? `${words.slice(0, 39)}…` : words;
};
// Quotes what an author wrote, so a quote inside it can't blur where it ends.
const quote = (value: string) => JSON.stringify(clip(value));
const or = (words: readonly string[]) => {
  const quoted = words.map((word) => `\`${word}\``);
  return quoted.length > 2
    ? `${quoted.slice(0, -1).join(", ")}, or ${quoted.at(-1)}`
    : quoted.join(" or ");
};

// mulberry32: a few lines, and enough to shuffle a handful of options the same way on every render.
function random(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let next = Math.imul(state ^ (state >>> 15), 1 | state);
    next = (next + Math.imul(next ^ (next >>> 7), 61 | next)) ^ next;
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

type Option = { key: string; text: string; correct: boolean; label: Node[]; rationale: Node[] };

const INLINE = new Set([
  "a",
  "abbr",
  "b",
  "br",
  "cite",
  "code",
  "del",
  "em",
  "i",
  "img",
  "ins",
  "kbd",
  "mark",
  "s",
  "small",
  "span",
  "strong",
  "sub",
  "sup",
  "u",
]);
// Text nodes and inline elements are the option's own line; a line break there is where a rationale lost its `>`.
const isInline = (node: Node) => !isElement(node) || INLINE.has(node[0]) || node[0].includes("-");
const isCheckbox = (node: Node | undefined): node is ElementNode =>
  isElement(node) && node[0] === "input" && node[1].type === "checkbox";
const checked = (box: ElementNode) =>
  isOn(box[1][":checked"]) || isOn(box[1].checked) || box[1].checked === "checked";
const isTaskList = (node: Node): node is ElementNode =>
  isElement(node) &&
  (node[0] === "ul" || node[0] === "ol") &&
  /\bcontains-task-list\b/.test(text(node[1].class));
const isList = (node: Node): node is ElementNode =>
  isElement(node) && (node[0] === "ul" || node[0] === "ol");
const textOf = (nodes: Node[]) => nodes.map((node) => textContent(node)).join("");
const words = (nodes: Node[]) => textOf(nodes).replace(/\s+/g, " ").trim();

// The checkbox drops out. A tight item holds it beside the text, and a loose one, or one with a rationale, inside a `p`.
function readOption(item: ElementNode): Omit<Option, "key"> | undefined {
  const children = childrenOf(item);
  let [first] = children;
  let rest = children.slice(1);
  let line: Node[] = [];
  if (isElement(first) && first[0] === "p" && isCheckbox(childrenOf(first)[0])) {
    line = childrenOf(first).slice(1);
    first = childrenOf(first)[0];
  } else if (isCheckbox(first)) {
    const end = rest.findIndex((node) => !isInline(node));
    line = end === -1 ? rest : rest.slice(0, end);
    rest = end === -1 ? [] : rest.slice(end);
  } else return undefined;
  const [lead] = line;
  if (lead !== undefined && !Array.isArray(lead)) line[0] = lead.trimStart();
  const quotes = rest.filter((node) => isElement(node) && node[0] === "blockquote");
  const label = [...line, ...rest.filter((node) => !quotes.includes(node))];
  return {
    text: words(label),
    correct: isCheckbox(first) && checked(first),
    label,
    rationale: quotes.flatMap((node) => (isElement(node) ? childrenOf(node) : [])),
  };
}

interface Walk {
  data: Data;
  issues: Issue[];
  counts: Record<Kind, number>;
  number: number;
  ids: Map<string, string>;
  labels?: Partial<QuizLabels>;
  prefix: string;
  blocks: number;
}

function shuffle(options: Option[], seed: string) {
  const next = random(Number.parseInt(hash(seed), 36));
  // Sorted by key first, so the order an author writes doesn't change the order readers see.
  const order = options.toSorted((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  for (let at = order.length - 1; at > 0; at--) {
    const to = Math.floor(next() * (at + 1));
    [order[at], order[to]] = [order[to]!, order[at]!];
  }
  return order;
}

function checkOptions(kind: Kind, name: string, options: Option[], walk: Walk) {
  const problem = (rule: Issue["rule"], message: string) => walk.issues.push({ rule, message });
  if (options.length > MAX_OPTIONS)
    problem(
      "comark/quiz/too-many-options",
      `${name} has ${options.length} options. Cut it to ${MAX_OPTIONS} or fewer, so a reader can weigh them all.`,
    );
  const right = options.filter((option) => option.correct);
  if (kind === "poll" && right.length)
    problem(
      "comark/quiz/correct-in-poll",
      `${name} marks ${quote(right[0]!.text)} \`[x]\`, but a poll has no right answer. Write every option as \`- [ ]\`, or make it a \`::question\`.`,
    );
  if (kind !== "question") return;
  if (!right.length)
    problem(
      "comark/quiz/no-correct-option",
      `${name} marks no option \`[x]\`, so no answer can be right. Mark the right one \`- [x]\`, or make it a \`::poll\`.`,
    );
  const wrong = options.filter((option) => !option.correct);
  const longest = Math.max(0, ...wrong.map((option) => option.text.length));
  const giveaway = right.find(
    (option) =>
      wrong.length >= 2 &&
      option.text.length >= longest * 1.6 &&
      option.text.length - longest >= 20,
  );
  if (giveaway)
    problem(
      "comark/quiz/longest-correct",
      `${name}: the right option ${quote(giveaway.text)} is much longer than the others, which gives it away. Shorten it, or add detail to the others.`,
    );
  for (const option of options) {
    if (POSITIONAL.some((pattern) => pattern.test(option.text)))
      problem(
        "comark/quiz/position-option",
        `${name}: the option ${quote(option.text)} points at other options by place, and options are shuffled. Write out what it means.`,
      );
    // A reason that lost its `>` is reported as that, not as a missing reason.
    const broken = textOf(option.label.filter(isInline)).trim().includes("\n");
    if (!option.correct && !option.rationale.length && !broken)
      problem(
        "comark/quiz/missing-rationale",
        `${name}: the wrong option ${quote(option.text)} doesn't say why it's wrong. Add a \`>\` line under it.`,
      );
  }
}

function checkText(name: string, options: Option[], content: Node[], walk: Walk) {
  for (const option of options) {
    const line = option.label.filter(isInline);
    const own = textOf(line).trim();
    const slot = SWALLOWED.exec(own)?.[1] ?? SWALLOWED.exec(textOf(option.rationale))?.[1];
    if (slot)
      walk.issues.push({
        rule: "comark/quiz/swallowed-slot",
        message: `${name}: \`#${slot}\` is inside the option ${quote(option.text)}, because the blank line before it is missing. Leave a blank line before \`#${slot}\`.`,
      });
    else if (own.includes("\n"))
      walk.issues.push({
        rule: "comark/quiz/line-break-option",
        message: `${name}: the option ${quote(own.split("\n")[0]!)} runs onto a second line, which is probably a rationale without its \`>\`. Start that line with \`> \`.`,
      });
  }
  const slot = SWALLOWED.exec(textOf(content))?.[1];
  if (slot)
    walk.issues.push({
      rule: "comark/quiz/swallowed-slot",
      message: `${name}: \`#${slot}\` is inside the text above it, because the blank line before it is missing. Leave a blank line before \`#${slot}\`.`,
    });
}

function checkProps(kind: Kind, name: string, node: ElementNode, walk: Walk) {
  const valid = PROPS[kind];
  const keys = new Set(Object.keys(node[1]).map((key) => key.replace(/^:/, "")));
  keys.delete("$");
  for (const key of keys) {
    if (valid.includes(key) || NATIVE.test(key)) continue;
    const hint = PROP_HINTS.get(key.toLowerCase());
    walk.issues.push({
      rule: "comark/quiz/unknown-prop",
      message: `${name}: \`${key}\` isn't a prop of \`::${kind}\`, so it's ignored.${hint ? ` ${hint}` : ""} Use ${or(valid)}.`,
    });
  }
}

const wrap = (tag: string, nodes: Node[], attrs: Record<string, unknown> = {}): ElementNode => [
  tag,
  attrs,
  ...nodes,
];

function quiz(node: ElementNode, kind: Kind, walk: Walk): string {
  const count = ++walk.counts[kind];
  const attrs = resolveAttributes(node[1], walk.data, { parseJson: true });
  const written = text(attrs.id);
  const name = `\`::${kind}\` ${count}${written ? ` (\`#${written}\`)` : ""}`;
  checkProps(kind, name, node, walk);

  const slots = new Map<string, Node[]>();
  const content: Node[] = [];
  for (const child of childrenOf(node)) {
    if (!isElement(child) || child[0] !== "template") {
      content.push(child);
      continue;
    }
    const slot = text(child[1].name) || "default";
    if (slot === "default") content.push(...childrenOf(child));
    else if (SLOTS[kind].includes(slot)) slots.set(slot, childrenOf(child));
    else {
      const valid = SLOTS[kind];
      const guess = SLOT_GUESSES.get(slot.toLowerCase())?.find((each) => valid.includes(each));
      walk.issues.push({
        rule: "comark/quiz/unknown-slot",
        message: `${name}: \`#${slot}\` isn't a slot of \`::${kind}\`, so it's dropped.${guess ? ` Did you mean \`#${guess}\`?` : ""} ${valid.length ? `Use ${or(valid.map((each) => `#${each}`))}.` : `A poll has only its prompt and options.`}`,
      });
    }
  }

  const at = kind === "recall" ? -1 : content.findIndex(isTaskList);
  const list = at === -1 ? undefined : content[at];
  const prompt = at === -1 ? content : content.slice(0, at);
  const after = at === -1 ? [] : content.slice(at + 1);
  const options: Option[] = [];
  const seen = new Set<string>();
  for (const item of isElement(list) ? childrenOf(list) : []) {
    if (!isElement(item) || item[0] !== "li") continue;
    const read = readOption(item);
    if (!read) continue;
    let key = hash(read.text);
    for (let n = 2; seen.has(key); n++) key = `${hash(read.text)}-${n}`;
    seen.add(key);
    options.push({ ...read, key });
  }
  if (kind !== "recall" && !options.length)
    walk.issues.push({
      rule: "comark/quiz/no-options",
      message: `${name} has no options. Write each one as a task-list item, ${kind === "question" ? "`- [ ]` for a wrong one and `- [x]` for the right one" : "`- [ ] ...`"}, after the prompt.${content.some(isList) ? " A plain list isn't read as options." : ""}`,
    });
  if (kind !== "recall" && options.length) checkOptions(kind, name, options, walk);
  checkText(name, options, [...prompt, ...after], walk);
  if (kind === "recall" && !slots.get("answer")?.length)
    walk.issues.push({
      rule: "comark/quiz/missing-answer",
      message: `${name} has no \`#answer\`, so Show answer reveals nothing. Add an \`#answer\` slot after the prompt.`,
    });

  const id =
    written ||
    `${kind}-${hash([words(prompt), ...options.map((option) => option.text)].join("\n"))}`;
  if (!written) {
    walk.issues.push({
      rule: "comark/quiz/missing-id",
      message: `${name} has no id, so a reader's answer is lost when its text changes. Give it one, as in \`::${kind}{#${kind === "recall" ? "why-microtasks" : "event-loop"}}\`.`,
    });
  }
  // Hosts keep answers by id across versions of a document, so an id never depends on where the block sits, even
  // when two blocks share one.
  const first = walk.ids.get(id);
  if (first)
    walk.issues.push({
      rule: "comark/quiz/duplicate-id",
      message: `${name} has the same id as ${first}, so their answers mix. Give each block its own id.`,
    });
  if (!first) walk.ids.set(id, name);

  const closes = text(attrs.closes);
  if (kind === "poll" && closes && Number.isNaN(Date.parse(closes)))
    walk.issues.push({
      rule: "comark/quiz/invalid-closes",
      message: `${name}: \`closes\` ${quote(closes)} isn't a date, so the poll never closes. Write an ISO date, as in \`closes="2026-11-01"\`.`,
    });

  const multiple =
    kind !== "recall" &&
    (isOn(attrs.multiple) || (kind === "question" && options.filter((o) => o.correct).length > 1));
  const order =
    kind === "question" && !isOff(attrs.shuffle)
      ? shuffle(options, [id, ...options.map((option) => option.key).sort()].join("\n"))
      : options;

  // Element ids and the radios' name come from the document and the block's place, so two documents on one page never
  // share them; the quiz id above is what hosts key answers by.
  const root: ElementNode[1] = { "quiz-id": id, uid: `${walk.prefix}-${++walk.blocks}` };
  if (kind !== "poll" && !isOff(attrs.number)) root.number = String(++walk.number);
  if (multiple) root.multiple = "true";
  if (kind === "poll" && closes && !Number.isNaN(Date.parse(closes))) root.closes = closes;
  const className = text(attrs.class);
  if (className) root.class = className;
  if (walk.labels) root.labels = walk.labels;

  const children: ElementNode[] = [wrap("quiz-prompt", prompt)];
  if (kind !== "recall")
    children.push(
      wrap(
        "quiz-options",
        order.map((option) => {
          const parts = [wrap("quiz-label", option.label)];
          if (option.rationale.length) parts.push(wrap("quiz-rationale", option.rationale));
          const row = wrap("quiz-option", parts, { key: option.key });
          if (kind === "question" && option.correct) row[1].correct = "true";
          return row;
        }),
      ),
    );
  if (after.length) children.push(wrap("quiz-after", after));
  for (const slot of SLOTS[kind]) {
    const nodes = slots.get(slot);
    if (nodes?.length) children.push(wrap(`quiz-${slot}`, nodes));
  }
  node[1] = root;
  node.splice(2, node.length - 2, ...children);
  return `\`::${kind}\` ${count}`;
}

/** Turns every `::question`, `::poll`, and `::recall` into its normalized form, and returns the problems it found. */
export function transform(
  nodes: Node[],
  data: Data,
  source: string,
  labels?: Partial<QuizLabels>,
): Issue[] {
  const walk: Walk = {
    prefix: `cqz-${hash(source)}`,
    blocks: 0,
    data,
    issues: [],
    counts: { question: 0, poll: 0, recall: 0 },
    number: 0,
    ids: new Map(),
    labels,
  };
  // A block inside another would put its options inside the outer one's, where a host reading the page can't tell
  // them apart, so it renders as plain content.
  const visit = (list: Node[], outer: string) => {
    for (const node of list) {
      if (!isElement(node) || node[1].$?.html) continue;
      const [tag] = node;
      if (KINDS.includes(tag) && outer) {
        // SAFETY: KINDS holds exactly the three kinds.
        const kind = tag as Kind;
        const name = `\`::${kind}\` ${++walk.counts[kind]}`;
        walk.issues.push({
          rule: "comark/quiz/nested-block",
          message: `${name} sits inside ${outer}, so it renders as plain text. Move it out, after ${outer}.`,
        });
        const content = childrenOf(node).flatMap((child) =>
          isElement(child) && child[0] === "template" ? childrenOf(child) : [child],
        );
        node.splice(0, node.length, "div", {}, ...content);
      } else if (KINDS.includes(tag)) {
        // SAFETY: KINDS holds exactly the three kinds.
        const kind = tag as Kind;
        visit(childrenOf(node), quiz(node, kind, walk));
        continue;
      }
      visit(childrenOf(node), outer);
    }
  };
  visit(nodes, "");
  return walk.issues;
}
