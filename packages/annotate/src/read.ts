import type { ElementNode, Node } from "comark";
import { resolveAttributes } from "comark/render";
import { textContent } from "comark/utils";
import { type Mark, marks } from "./marks.ts";
import { place } from "./place.ts";
import { childrenOf, isElement } from "../../../shared/nodes.ts";
import { text } from "../../../shared/text.ts";
import { isWebUrl } from "../../../shared/url.ts";

export interface Annotation {
  /** Links the mark to its note; unique within a screenshot or compare. */
  n: number;
  /** The number shown on the stamp. Side notes have none: their arrow links them. */
  number?: number;
  x: number;
  y: number;
  w: number;
  h: number;
  mark: Mark;
  color?: string;
  /** Pull the note out beside, above, or below the image, joined to the mark by an arrow. */
  side?: Side;
  /** Where a side note sits along its margin, as a percentage of the image: across for top and bottom, down for left and right. */
  at?: number;
  /** The point the arrow lands on, as percentages of the image. Without it the arrow meets the mark's edge. */
  to?: { x: number; y: number };
  note: Node[];
}

export interface Screenshot {
  src: string;
  /** The color of every mark that doesn't set its own. */
  ink?: string;
  alt: string;
  title?: string;
  href?: string;
  /** The image's height over its width, from `viewport`, which places the stamps. */
  aspect?: number;
  /** The capture size in pixels, from `viewport`. */
  viewport?: { width: number; height: number };
  annotations: Annotation[];
  caption: Node[];
}

/** How a compare shows its pair: side by side, or laid over each other with a divider the reader drags. */
export const MODES = ["columns", "slider"] as const;
export type Mode = (typeof MODES)[number];

export interface Compare {
  title?: string;
  ink?: string;
  mode: Mode;
  shots: Screenshot[];
}

/** What `:bound` props resolve against: the renderer's `state.renderData`, or the parsed document. */
export type Data = Parameters<typeof resolveAttributes>[1];

/** Named colors, each with one meaning. Anything else must be a hex color. */
export const PALETTE = ["red", "amber", "green", "blue", "violet", "gray"] as const;

/** One problem: the comark-linter rule it falls under, and the sentence that names its block and the fix. */
export type Issue = { rule: `comark/annotate/${string}`; message: string };

// Prefixes each problem with the block it's in, keeping its rule.
const within = (where: string, problems: Issue[]): Issue[] =>
  problems.map(({ rule, message }) => ({ rule, message: `${where}: ${message}` }));

// What `check` calls each screenshot and compare in its messages. The renderer reports nothing, so it needs no names.
type Names = Map<ElementNode, string>;

// Inline, YAML-block, and `:bound` props all land here, parsed the way Comark's own renderers see them.
const props = (node: ElementNode, data: Data) =>
  resolveAttributes(node[1], data, { parseJson: true });
// A `:bound` prop that resolved to nothing. The required-prop checks skip it, and `checkProps` reports it unless it
// reads render-time data.
const unresolved = (node: ElementNode, attrs: Record<string, unknown>, key: string) =>
  attrs[key] === undefined && Object.hasOwn(node[1], `:${key}`);
// Only the renderer's `data` and the parent's `props` are unknown while parsing; frontmatter and meta are already here.
const later = (path: string) => /^(?:data|props)(?:\.|$)/.test(path);
// Quotes what an author wrote, so a quote inside it can't blur where the name ends.
const quote = (value: string) => JSON.stringify(value);
// Invalid bound values can be circular, contain a BigInt, or throw while being stringified.
// Keep diagnostics best-effort so malformed props never escape the parser.
const describe = (value: unknown) => {
  try {
    return String(value);
  } catch {
    return "<unprintable value>";
  }
};
const named = new Set<string>(PALETTE);
// Alpha hex colors are left out: a transparent one would hide the mark.
const isColor = (color: string) => named.has(color) || /^#(?:[\da-f]{3}|[\da-f]{6})$/i.test(color);
const isMark = (mark: string): mark is Mark => Object.hasOwn(marks, mark);
// Comments render nothing, so they don't count as a note; an image does.
const hasContent = (nodes: Node[]): boolean =>
  nodes.some((node) =>
    !Array.isArray(node)
      ? node.trim() !== ""
      : isElement(node) && (node[0] === "img" || hasContent(childrenOf(node))),
  );
// Allow half a percent of rounding error when an agent converts pixels to percentages.
const EDGE = 100.5;
const SIDES = ["left", "right", "top", "bottom"] as const;
export type Side = (typeof SIDES)[number];
// Notes on one side closer than this would likely overlap: % of the image height for left and right, of its
// width for top and bottom. A heuristic, since the text itself can't be measured.
const SIDE_GAP = { left: 12, right: 12, top: 25, bottom: 25 };
// styles.ts links marks and notes for this many annotations per screenshot or compare.
export const MAX_LINKED = 40;

const PROPS = {
  screenshot: ["src", "alt", "title", "href", "viewport", "ink"],
  compare: ["title", "mode", "ink"],
  annotation: ["x", "y", "w", "h", "mark", "color", "side", "at", "to"],
} as const;
type Block = keyof typeof PROPS;
// Comark's own attributes, which a host may style or test by, so they aren't reported.
const NATIVE = /^(?:id|class|style|data-.+|aria-.+)$/i;
// Names an author is likely to guess, and what to write instead.
const HINTS: Record<Block, Record<string, string>> = {
  screenshot: {
    label: "Did you mean `title`?",
    url: "Did you mean `href`?",
    color: "Did you mean `ink`? It colors every mark in the screenshot.",
    caption: "Write the caption as Markdown inside the block, after the annotations.",
    width: "The image keeps its own size; set `viewport` to record the capture size.",
    height: "The image keeps its own size; set `viewport` to record the capture size.",
  },
  compare: {
    label: "Did you mean `title`?",
    color: "Did you mean `ink`? It colors every mark in the compare.",
    viewport: "Set `viewport` on each screenshot instead.",
  },
  annotation: {
    width: "Did you mean `w`?",
    height: "Did you mean `h`?",
    colour: "Did you mean `color`?",
    left: "Did you mean `x`?",
    top: "Did you mean `y`?",
    target: "Did you mean `to`?",
    point: "Did you mean `to`?",
    label: "Write the note as the block's content.",
    title: "Write the note as the block's content.",
    note: "Write the note as the block's content.",
    text: "Write the note as the block's content.",
  },
};

function distance(a: string, b: string) {
  let row = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i++) {
    const next = [i];
    for (let j = 1; j <= b.length; j++)
      next[j] = Math.min(
        row[j]! + 1,
        next[j - 1]! + 1,
        row[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    row = next;
  }
  return row[b.length]!;
}

// Unknown props are dropped, and broken bindings would render at 0 or empty, so both are reported.
function checkProps(
  block: Block,
  node: ElementNode,
  attrs: Record<string, unknown>,
  problems: Issue[],
  data: Data,
) {
  const valid: readonly string[] = PROPS[block];
  // The raw keys, since resolving drops some: a bound `__proto__` would set the result's prototype instead.
  const keys = new Set(Object.keys(node[1]).map((key) => key.replace(/^:/, "")));
  keys.delete("$");
  for (const key of keys) {
    if (NATIVE.test(key)) continue;
    if (valid.includes(key)) {
      // Comark drops a bound `src` or `href` that resolves to an unsafe URL, such as javascript:. The binding is
      // resolved alone, since a plain value next to it would still fill `attrs`.
      const bound = `:${key}`;
      if (
        Object.hasOwn(node[1], bound) &&
        !Object.hasOwn(props([node[0], { [bound]: node[1][bound] }], data), key)
      ) {
        problems.push({
          rule: "comark/annotate/unsafe-bound-url",
          message: `\`:${key}\` resolves to an unsafe URL, so it's left out. Use an http:// or https:// URL${key === "src" ? " or a path to the image file" : ""}.`,
        });
        continue;
      }
      const path = text(node[1][`:${key}`]);
      if (unresolved(node, attrs, key) && !later(path))
        problems.push({
          rule: "comark/annotate/undefined-binding",
          message: `\`:${key}\` points at ${path}, which is undefined. Fix the path or set \`${key}\` directly.`,
        });
      continue;
    }
    const lower = key.toLowerCase();
    const close = valid.find(
      (name) => lower.length >= 3 && distance(lower, name) <= (lower.length >= 5 ? 2 : 1),
    );
    const hints = HINTS[block];
    const hint = Object.hasOwn(hints, lower)
      ? hints[lower]
      : close
        ? `Did you mean \`${close}\`?`
        : "";
    problems.push({
      rule: "comark/annotate/unknown-prop",
      message: `\`${key}\` isn't a prop of \`::${block}\`.${hint ? ` ${hint}` : ""} Valid props: ${valid.join(", ")}.`,
    });
  }
}

const VIEWPORT = /^(\d+)\s*[x×]\s*(\d+)$/i;

/** Reads a `::screenshot` node, counting on from `start`. Problems go to `issues`; rendering never throws. */
export function readScreenshot(
  node: ElementNode,
  issues: Issue[],
  data: Data,
  names: Names = new Map(),
  start: { n: number; number: number; sides?: readonly Side[]; ink?: string } = {
    n: 1,
    number: 1,
  },
): Screenshot {
  let number = start.number;
  const where = names.get(node) ?? "screenshot";
  const problems: Issue[] = [];
  const attrs = props(node, data);
  checkProps("screenshot", node, attrs, problems, data);
  const src = text(attrs.src);
  if (!src && !unresolved(node, attrs, "src"))
    problems.push({
      rule: "comark/annotate/missing-src",
      message: "`src` is required. Point it at the image file.",
    });
  const alt = text(attrs.alt);
  if (!alt && !unresolved(node, attrs, "alt"))
    problems.push({
      rule: "comark/annotate/missing-alt",
      message: "`alt` is required. Describe what the screenshot shows.",
    });
  const href = text(attrs.href);
  if (href && !isWebUrl(href))
    problems.push({
      rule: "comark/annotate/invalid-href",
      message: "`href` must be an http:// or https:// URL with a host. Link the page you captured.",
    });
  const viewport = text(attrs.viewport);
  const size = VIEWPORT.exec(viewport);
  if (viewport && !size)
    problems.push({
      rule: "comark/annotate/invalid-viewport",
      message: `\`viewport\` must be the capture size in pixels, like 1440x900 (got ${quote(viewport)}).`,
    });
  const own = readInk(attrs, problems);
  const ink = own ?? start.ink;
  issues.push(...within(where, problems));

  const annotations: Annotation[] = [];
  const caption: Node[] = [];
  for (const child of childrenOf(node)) {
    if (isElement(child) && child[0] === "annotation") {
      const n = start.n + annotations.length;
      const found: Issue[] = [];
      const annotation = readAnnotation(child, found, data);
      if (annotation.side && !(start.sides ?? SIDES).includes(annotation.side))
        annotation.side = undefined;
      const stamp = annotation.side ? undefined : number++;
      const index = annotations.length + 1;
      const label = `${where}, annotation ${index}${annotation.side ? ` (${annotation.side} note)` : stamp === index ? "" : ` (stamp ${stamp})`}`;
      issues.push(...within(label, found));
      if (n === MAX_LINKED + 1)
        issues.push({
          rule: "comark/annotate/too-many-annotations",
          message: `${where}: more than ${MAX_LINKED} annotations in one screenshot or compare. Hovering stops linking marks to notes after ${MAX_LINKED}; split it into several screenshots.`,
        });
      annotations.push({ ...annotation, color: annotation.color ?? ink, n, number: stamp });
    } else caption.push(child);
  }
  const nestedProblems: Issue[] = [];
  nested(caption, nestedProblems);
  issues.push(...within(where, nestedProblems));
  for (const side of SIDES) {
    const centers = annotations
      .flatMap((annotation, index) =>
        annotation.side === side
          ? [
              {
                index: index + 1,
                at: noteAt(annotation),
              },
            ]
          : [],
      )
      .sort((a, b) => a.at - b.at);
    for (let i = 1; i < centers.length; i++)
      if (centers[i]!.at - centers[i - 1]!.at < SIDE_GAP[side])
        issues.push({
          rule: "comark/annotate/side-notes-overlap",
          message: `${where}: the ${side} notes for annotations ${centers[i - 1]!.index} and ${centers[i]!.index} would overlap. Move one along with \`at\`, to another side, or under the image.`,
        });
  }
  const aspect = size ? Number(size[2]) / Number(size[1]) : undefined;
  for (const [a, b] of place(annotations, aspect).clashes)
    issues.push({
      rule: "comark/annotate/numbers-overlap",
      message: `${where}: the numbers of annotations ${a} and ${b} overlap at every corner of their marks. Leave room between the marks, or merge them into one annotation.`,
    });
  return {
    src,
    alt,
    title: text(attrs.title) || undefined,
    href: isWebUrl(href) ? href : undefined,
    ink,
    aspect,
    viewport: size ? { width: Number(size[1]), height: Number(size[2]) } : undefined,
    annotations,
    caption,
  };
}

function readAnnotation(node: ElementNode, problems: Issue[], data: Data): Omit<Annotation, "n"> {
  const attrs = props(node, data);
  checkProps("annotation", node, attrs, problems, data);
  const box = { x: 0, y: 0, w: 0, h: 0 };
  let known = true;
  for (const key of ["x", "y", "w", "h"] as const) {
    if (unresolved(node, attrs, key)) {
      known = false;
      continue;
    }
    const raw = text(attrs[key]);
    const value = /^(?:\d+(?:\.\d*)?|\.\d+)$/.test(raw) ? Number(raw) : Number.NaN;
    const range = key === "x" || key === "y" ? "from 0 to 100" : "above 0 and up to 100";
    const valid = key === "x" || key === "y" ? value <= 100 : value > 0 && value <= 100;
    if (!raw) {
      known = false;
      problems.push({
        rule: "comark/annotate/invalid-position",
        message: `\`${key}\` is required: a percentage of the image, a number without %, ${range}.`,
      });
    } else if (!valid) {
      known = false;
      problems.push({
        rule: "comark/annotate/invalid-position",
        message: `\`${key}\` must be a percentage of the image, a number without %, ${range} (got ${quote(raw)}).`,
      });
    } else box[key] = value;
  }
  if (known && (box.x + box.w > EDGE || box.y + box.h > EDGE))
    problems.push({
      rule: "comark/annotate/box-outside-image",
      message: "the box runs past the image edge. Keep x + w and y + h within 100.",
    });
  // Fractions such as x=0.25 are the likeliest slip when converting pixels; a real box this small would be a speck.
  const values = Object.values(box);
  if (
    known &&
    values.every((value) => value <= 1) &&
    values.some((value) => !Number.isInteger(value))
  )
    problems.push({
      rule: "comark/annotate/box-as-fraction",
      message:
        "`x`, `y`, `w`, and `h` are all 1 or less, so the box is a speck in the top left corner. They're percentages: multiply each by 100, so x=0.25 becomes x=25.",
    });

  const mark = readMark(node, attrs, problems);
  const at = readAt(attrs, problems);
  const to = readTo(attrs, problems);
  if ((at !== undefined || to) && !mark.side)
    problems.push({
      rule: "comark/annotate/needs-side",
      message: `\`${at === undefined ? "to" : "at"}\` places a side note and its arrow, so it needs a \`side\`. Add \`side="top"\`, \`"bottom"\`, \`"left"\`, or \`"right"\`.`,
    });
  return { ...box, ...mark, at, to };
}

const PERCENT = /^(?:\d+(?:\.\d*)?|\.\d+)$/;
const percent = (raw: string) => (PERCENT.test(raw) ? Number(raw) : Number.NaN);
const nonText = (value: unknown) => {
  return value !== undefined && value !== null && value !== "" && !text(value);
};

function readAt(attrs: Record<string, unknown>, problems: Issue[]) {
  const value = attrs.at;
  if (nonText(value)) {
    problems.push({
      rule: "comark/annotate/invalid-position",
      message: `\`at\` must be where the note sits along its margin, a percentage of the image from 0 to 100 (got ${quote(describe(value))}).`,
    });
    return undefined;
  }
  const raw = text(value);
  if (!raw) return undefined;
  const parsed = percent(raw);
  if (parsed <= 100) return parsed;
  problems.push({
    rule: "comark/annotate/invalid-position",
    message: `\`at\` must be where the note sits along its margin, a percentage of the image from 0 to 100 (got ${quote(raw)}).`,
  });
  return undefined;
}

function readTo(attrs: Record<string, unknown>, problems: Issue[]) {
  const value = attrs.to;
  if (nonText(value)) {
    problems.push({
      rule: "comark/annotate/invalid-position",
      message: `\`to\` must be the point the arrow lands on, as two percentages of the image from 0 to 100, like to="42,18" (got ${quote(describe(value))}).`,
    });
    return undefined;
  }
  const raw = text(value);
  if (!raw) return undefined;
  const [x, y, extra] = raw.split(/\s*,\s*|\s+/).map(percent);
  if (x! <= 100 && y! <= 100 && extra === undefined) return { x: x!, y: y! };
  problems.push({
    rule: "comark/annotate/invalid-position",
    message: `\`to\` must be the point the arrow lands on, as two percentages of the image from 0 to 100, like to="42,18" (got ${quote(raw)}).`,
  });
  return undefined;
}

function readInk(attrs: Record<string, unknown>, problems: Issue[]) {
  const value = attrs.ink;
  if (nonText(value)) {
    problems.push({
      rule: "comark/annotate/invalid-color",
      message: `\`ink\` must be ${PALETTE.join(", ")}, or a 3- or 6-digit hex color like #8b5cf6 (got ${quote(describe(value))}).`,
    });
    return undefined;
  }
  const ink = text(value);
  if (!ink) return undefined;
  if (isColor(ink)) return ink;
  problems.push({
    rule: "comark/annotate/invalid-color",
    message: `\`ink\` must be ${PALETTE.join(", ")}, or a 3- or 6-digit hex color like #8b5cf6 (got ${quote(ink)}).`,
  });
  return undefined;
}

/** Where the arrow of a side note lands: its \`to\` point, or else the middle of the mark's edge that faces the note. */
export function target(annotation: Pick<Annotation, "x" | "y" | "w" | "h" | "side" | "to">) {
  if (annotation.to) return annotation.to;
  const { x, y, w, h, side } = annotation;
  if (side === "left") return { x, y: y + h / 2 };
  if (side === "right") return { x: x + w, y: y + h / 2 };
  return { x: x + w / 2, y: side === "bottom" ? y + h : y };
}

/** Where a side note sits along its margin: its \`at\`, or else level with where its arrow lands. */
export function noteAt(annotation: Pick<Annotation, "x" | "y" | "w" | "h" | "side" | "to" | "at">) {
  if (annotation.at !== undefined) return annotation.at;
  const point = target(annotation);
  return annotation.side === "left" || annotation.side === "right" ? point.y : point.x;
}

/**
 * Reads what an annotation draws and says: its mark, color, side, and note, but not where it sits. comark-charts
 * places the annotations in a chart itself and reads the rest here, so marks are checked the same everywhere.
 */
export function readMark(
  node: ElementNode,
  attrs: Record<string, unknown>,
  problems: Issue[],
): Pick<Annotation, "mark" | "color" | "side" | "note"> {
  const mark = text(attrs.mark) || "box";
  if (!isMark(mark))
    problems.push({
      rule: "comark/annotate/unknown-mark",
      message: `\`mark\` must be one of ${Object.keys(marks).join(", ")} (got ${quote(mark)}).`,
    });
  const color = text(attrs.color);
  if (color && !isColor(color))
    problems.push({
      rule: "comark/annotate/invalid-color",
      message: `\`color\` must be ${PALETTE.join(", ")}, or a 3- or 6-digit hex color like #e5484d (got ${quote(color)}).`,
    });
  const side = text(attrs.side);
  const knownSide = SIDES.find((item) => item === side);
  if (side && !knownSide)
    problems.push({
      rule: "comark/annotate/invalid-side",
      message: `\`side\` must be left, right, top, or bottom (got ${quote(side)}).`,
    });
  if (mark === "none" && !side && !unresolved(node, attrs, "side"))
    problems.push({
      rule: "comark/annotate/invisible-mark",
      message:
        '`mark="none"` draws nothing, so without a `side` note nothing points at the spot. Add `side="top"`, `"bottom"`, `"left"`, or `"right"`, or pick a visible mark such as `box`.',
    });
  const note = childrenOf(node);
  if (!hasContent(note))
    problems.push({
      rule: "comark/annotate/missing-note",
      message: "write a note explaining what the mark points at.",
    });
  nested(note, problems);

  return {
    mark: isMark(mark) ? mark : "box",
    color: isColor(color) ? color : undefined,
    side: knownSide,
    note,
  };
}

// Screenshots, compares, and annotations only work as direct children; deeper ones would be dropped or unchecked.
const BLOCKS = new Set(["screenshot", "compare", "annotation"]);
function nested(nodes: Node[], problems: Issue[]) {
  for (const node of nodes) {
    if (!isElement(node)) continue;
    if (BLOCKS.has(node[0]))
      problems.push({
        rule: "comark/annotate/nested-block",
        message: `\`${node[0]}\` can't go inside a note or caption.${node[0] === "annotation" ? " Annotations must be direct children of a screenshot." : " Move it out after the block."}`,
      });
    else nested(childrenOf(node), problems);
  }
}

/** Reads a `::compare` node: two screenshots numbered as one sequence, titled Before and After unless they say otherwise. */
export function readCompare(
  node: ElementNode,
  issues: Issue[],
  data: Data,
  names: Names = new Map(),
): Compare {
  const where = names.get(node) ?? "compare";
  const attrs = props(node, data);
  const problems: Issue[] = [];
  checkProps("compare", node, attrs, problems, data);
  const ink = readInk(attrs, problems);
  issues.push(...within(where, problems));
  const mode = text(attrs.mode) || "columns";
  const known = MODES.find((item) => item === mode);
  // A note beside one screenshot of a pair would sit against the other one and narrow its own image, and in a slider
  // its arrow would cross the divider. Those notes join the numbered list; notes above and below stay in their column.
  const sides = known === "slider" ? [] : (["top", "bottom"] as const);
  const shots: Screenshot[] = [];
  const viewports: { name: string; size?: { width: number; height: number } }[] = [];
  for (const child of childrenOf(node)) {
    if (isElement(child) && child[0] === "screenshot") {
      const all = shots.flatMap((item) => item.annotations);
      const shot = readScreenshot(child, issues, data, names, {
        n: 1 + all.length,
        number: 1 + all.filter((annotation) => annotation.number).length,
        sides,
        ink,
      });
      shots.push({ ...shot, title: shot.title ?? (shots.length ? "After" : "Before") });
      viewports.push({ name: names.get(child) ?? "screenshot", size: shot.viewport });
    } else if (isElement(child) || text(child))
      issues.push({
        rule: "comark/annotate/compare-content",
        message: `${where}: only \`screenshot\` blocks can go inside a compare (found ${isElement(child) && child[0] !== "p" ? `\`${child[0]}\`` : "text"}). Move it before or after the compare.`,
      });
  }
  if (shots.length !== 2)
    issues.push({
      rule: "comark/annotate/compare-screenshot-count",
      message: `${where}: needs exactly two screenshots, before and after (got ${shots.length}). ${shots.length < 2 ? "Add the missing one" : "Split the rest into another compare"}.`,
    });
  else if (shots[0]!.src && shots[0]!.src === shots[1]!.src)
    issues.push({
      rule: "comark/annotate/compare-same-image",
      message: `${where}: both screenshots show ${quote(shots[0]!.src)}, so there's no change to see. Point the after screenshot at the new capture.`,
    });
  const [before, after] = viewports;
  const px = (size: { width: number; height: number }) => `${size.width}x${size.height}`;
  if (
    before?.size &&
    after?.size &&
    (before.size.width !== after.size.width || before.size.height !== after.size.height)
  )
    issues.push({
      rule: "comark/annotate/compare-viewport-mismatch",
      message: `${where}: ${before.name} was captured at ${px(before.size)} and ${after.name} at ${px(after.size)}, so they can't be compared. Recapture both at the same viewport.`,
    });
  if (!known)
    issues.push({
      rule: "comark/annotate/invalid-mode",
      message: `${where}: \`mode\` is ${quote(mode)}, which isn't a compare mode. Use \`columns\` (side by side, the default) or \`slider\`.`,
    });
  return { title: text(attrs.title) || undefined, ink, mode: known ?? "columns", shots };
}

// Every screenshot is named by its src when no other screenshot shares it, and otherwise by its position and alt.
function name(nodes: Node[], data: Data): Names {
  const shots: ElementNode[] = [];
  const compares: ElementNode[] = [];
  const walk = (list: Node[]) => {
    for (const node of list) {
      if (!isElement(node)) continue;
      if (node[0] === "screenshot") shots.push(node);
      else {
        if (node[0] === "compare") compares.push(node);
        if (node[0] !== "annotation") walk(childrenOf(node));
      }
    }
  };
  walk(nodes);
  const names: Names = new Map();
  const srcs = shots.map((node) => text(props(node, data).src));
  for (const [index, node] of shots.entries()) {
    const src = srcs[index]!;
    const alt = text(props(node, data).alt);
    names.set(
      node,
      src && srcs.indexOf(src) === srcs.lastIndexOf(src)
        ? `screenshot ${quote(src)}`
        : `screenshot ${index + 1}${alt ? ` (${quote(alt)})` : ""}`,
    );
  }
  for (const [index, node] of compares.entries()) {
    const title = text(props(node, data).title);
    names.set(node, `compare ${index + 1}${title ? ` (${quote(title)})` : ""}`);
  }
  return names;
}

/** Every problem in a document's screenshots, compares, and annotations. */
export function check(nodes: Node[], data: Data): Issue[] {
  const issues: Issue[] = [];
  const names = name(nodes, data);
  let stray = 0;
  const walk = (list: Node[]) => {
    for (const node of list) {
      if (!isElement(node)) continue;
      if (node[0] === "compare") readCompare(node, issues, data, names);
      else if (node[0] === "screenshot") readScreenshot(node, issues, data, names);
      // comark-charts checks the annotations in a chart, which point at data rather than at a box.
      else if (node[0] === "chart") continue;
      else if (node[0] === "annotation") {
        const note = textContent(["div", {}, ...childrenOf(node)])
          .trim()
          .slice(0, 40);
        issues.push({
          rule: "comark/annotate/annotation-outside-screenshot",
          message: `annotation ${++stray} outside a screenshot${note ? ` (${quote(note)})` : ""}: it has nothing to point at. Move it inside the \`::screenshot\` it marks, as a direct child.`,
        });
      } else walk(childrenOf(node));
    }
  };
  walk(nodes);
  return issues;
}
