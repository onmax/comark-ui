// Hand-written motion (ViteHub UI's docs/design/motion.md, which comark-motion brings to every document): a block gets
// its motion from the motion layer, by the role of its elements, or from a motion helper, never from code of its own.
// The rule is ViteHub's `test/design-rules.test.ts`, run on the packages' sources, `shared/`, and the docs app.
//
// It finds motion that moves, resizes, or shakes: `@keyframes` and `animation` that change `transform`, position, or
// size, transitions on `transform`, `scale`, `translate`, `rotate`, size, position, `margin`, `clip-path`, grid tracks,
// or `all` (also in style strings and `style.setProperty`), a press or hover that moves, Tailwind's moving classes, WAAPI
// `.animate()` calls that move, and `requestAnimationFrame` loops that write styles. Color and opacity fades are not
// motion. A spinner that turns forever and a skeleton pulse show that work runs, so they are allowed too.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { createSourceFile, getLeadingCommentRanges, getTrailingCommentRanges, ScriptTarget } from "typescript";
import type { Node } from "typescript";
import { describe, expect, it } from "vite-plus/test";

const root = new URL("..", import.meta.url).pathname;
const surfaces = [
  ...readdirSync(join(root, "packages")).map((folder) => `packages/${folder}/src`),
  "shared",
  "docs/app",
];

/**
 * Own-motion figures: parts that draw their own picture and are not controls. Each sets `data-motion="none"` on its
 * root, so the motion layer skips it, and the rule skips its files. A control, a label, or a list next to a figure still
 * gets its motion from the layer. Keep this list as short as the truth allows, and give each entry its reason.
 */
const ownMotionFigures: Array<{ path: string; reason: string }> = [];

const ignoreDirs = new Set(["dist", "node_modules", ".nuxt", ".output", "content"]);
const sourceFile = /\.(vue|ts|css|svelte)$/;

interface Finding {
  file: string;
  line: number;
  text: string;
}

function walk(directory: string): string[] {
  let entries: string[];
  try {
    entries = readdirSync(directory);
  } catch {
    return [];
  }
  return entries.flatMap((name) => {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) return ignoreDirs.has(name) ? [] : walk(path);
    return sourceFile.test(name) && !name.endsWith(".test.ts") ? [path] : [];
  });
}

const motionProperty =
  /^(?:transform|translate|scale|rotate|all|(?:min-|max-)?(?:width|height)|block-size|inline-size|inset|top|right|bottom|left|margin(?:-\w+)?|padding(?:-\w+)?|clip-path|grid-template-(?:rows|columns)|flex-basis)$/;
const motionDeclaration =
  /(?:^|[\s;{])(?:transform|translate|scale|rotate|(?:min-|max-)?(?:width|height)|block-size|inset|top|right|bottom|left|margin(?:-\w+)?|clip-path)\s*:/;

function withoutComments(file: string, text: string): string {
  const blank = (match: string) => match.replace(/[^\r\n]/g, " ");
  let result = text.replace(/\/\*[\s\S]*?\*\//g, blank);
  if (file.endsWith(".vue") || file.endsWith(".svelte"))
    result = result.replace(/<!--[\s\S]*?-->/g, blank).replace(/^\s*\/\/.*$/gm, blank);
  if (!file.endsWith(".ts")) return result;
  const source = createSourceFile(file, text, ScriptTarget.Latest);
  const ranges = new Map<number, number>();
  const visit = (node: Node) => {
    for (const range of [
      ...(getLeadingCommentRanges(text, node.pos) ?? []),
      ...(getTrailingCommentRanges(text, node.end) ?? []),
    ])
      ranges.set(range.pos, range.end);
    for (const child of node.getChildren(source)) visit(child);
  };
  visit(source);
  for (const [start, end] of ranges)
    result = result.slice(0, start) + blank(text.slice(start, end)) + result.slice(end);
  return result;
}

/** The text between the bracket at `open` and its partner, or the rest of the text. */
function balanced(text: string, open: number): string {
  const pairs: Record<string, string> = { "(": ")", "{": "}", "[": "]" };
  const close = pairs[text[open]!]!;
  let depth = 0;
  for (let index = open; index < text.length; index++) {
    if (text[index] === text[open]) depth++;
    else if (text[index] === close && --depth === 0) return text.slice(open + 1, index);
  }
  return text.slice(open + 1);
}

/** The parts of a list at depth 0, such as the transitions of `opacity 1s, transform 1s`. */
function splitList(value: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let index = 0; index < value.length; index++) {
    if (value[index] === "(") depth++;
    else if (value[index] === ")") depth--;
    else if (value[index] === "," && depth === 0) {
      parts.push(value.slice(start, index));
      start = index + 1;
    }
  }
  return [...parts, value.slice(start)].map((part) => part.trim()).filter(Boolean);
}

/** True when a `transition` value animates a property that moves. A value that starts with a duration animates `all`. */
function transitionMoves(value: string): boolean {
  return splitList(value).some((part) => {
    const first = part.split(/\s+/)[0]!;
    return motionProperty.test(first) || /^[\d.]+m?s$/.test(first);
  });
}

/** True when the frames of a `@keyframes` rule move. Frames that only turn, as a spinner does, do not count. */
function keyframesMove(body: string): boolean {
  const declarations = [...body.matchAll(/([\w-]+)\s*:\s*([^;}]+)/g)].map(([, property, value]) => [
    property!,
    value!.trim(),
  ]);
  const spinner =
    declarations.length > 0 &&
    declarations.every(
      ([property, value]) =>
        property === "rotate" || (property === "transform" && /^rotate\([^)]*\)$/.test(value!)),
    );
  return !spinner && motionDeclaration.test(body);
}

const animationKeywords = new Set(
  "none initial inherit unset infinite linear ease ease-in ease-out ease-in-out forwards backwards both alternate alternate-reverse reverse normal running paused step-start step-end".split(
    " ",
  ),
);

/** True when an `animation` value plays keyframes that move, or keyframes that no surface defines. */
function animationMoves(value: string, keyframes: Map<string, boolean>): boolean {
  const names = value
    .split(/[\s,_]+/)
    .filter(
      (token) =>
        /^[a-z][\w-]*$/i.test(token) &&
        !animationKeywords.has(token) &&
        !/^(?:cubic-bezier|steps|var)$/.test(token),
    );
  if (!names.length) return false;
  const known = names.filter((name) => keyframes.has(name));
  return known.length ? known.some((name) => keyframes.get(name)) : true;
}

/** Every declaration of `property` with its value: CSS (also in strings), a quoted value, or an assignment in script. */
function declarations(source: string, property: "transition" | "animation") {
  const long = property === "transition" ? "-property" : "-name";
  const camel = property === "transition" ? "Property" : "Name";
  const name = `(?<![\\w-])${property}(?:${long}|${camel})?`;
  const forms = [
    new RegExp(`${name}\\s*:\\s*(?![\\s"'\`])((?:(?!\\n\\s*[\\w-]+\\s*:)[^;{}"'\`])+)`, "g"),
    new RegExp(`${name}\\s*[:=]\\s*(["'\`])((?:(?!\\1)[^\\\\]|\\\\[\\s\\S])*)\\1`, "g"),
    new RegExp(`${name}\\s*=\\s*(?![\\s"'\`])([^;{}"'\`\\n]+)`, "g"),
    new RegExp(`setProperty\\(\\s*["'\`]${property}(?:${long})?["'\`]\\s*,\\s*["'\`]([^"'\`]*)`, "g"),
  ];
  return forms.flatMap((form) =>
    [...source.matchAll(form)].map((match) => ({
      index: match.index,
      text: match[0],
      value: match.at(-1)!,
    })),
  );
}

/** True when a function named `name` asks for the next frame with itself, as a frame loop does. */
function selfScheduling(source: string, name: string): boolean {
  const declaration = new RegExp(
    `(?:function\\s+${name}\\s*\\([^)]*\\)\\s*|\\b${name}\\s*=\\s*(?:async\\s*)?(?:\\([^)]*\\)|\\w+)\\s*=>\\s*)\\{`,
  ).exec(source);
  if (!declaration) return false;
  return new RegExp(`requestAnimationFrame\\(\\s*${name}\\s*\\)`).test(
    balanced(source, declaration.index + declaration[0].length - 1),
  );
}

function scan(file: string, text: string, keyframes: Map<string, boolean>): Finding[] {
  const source = withoutComments(file, text);
  const findings: Finding[] = [];
  const add = (index: number, found: string) =>
    findings.push({
      file,
      line: source.slice(0, index).split("\n").length,
      text: found.trim().replace(/\s+/g, " ").slice(0, 80),
    });
  for (const match of source.matchAll(/@keyframes\s+([\w-]+)\s*\{/g))
    if (keyframes.get(match[1]!)) add(match.index, match[0]);
  for (const { index, text: found, value } of declarations(source, "animation"))
    if (animationMoves(value, keyframes)) add(index, found);
  for (const { index, text: found, value } of declarations(source, "transition"))
    if (transitionMoves(value)) add(index, found);
  for (const match of source.matchAll(
    /(?<![\w-])(?:[\w\-[\]&=>.*()@/]+:)*transition-(?:transform|all|\[([^\]\s]+)\])(?![\w-])/g,
  ))
    if (
      match[1] === undefined ||
      splitList(match[1].replace(/_/g, " ")).some((property) => motionProperty.test(property))
    )
      add(match.index, match[0]);
  for (const match of source.matchAll(
    /(?<![\w-])(?:[\w\-[\]&=>.*()@/]+:)*(?:active|hover|group-hover|group-active):-?scale-[\w[\].]+/g,
  ))
    add(match.index, match[0]);
  // A CSS press or hover that moves, such as `button:active { scale: .96 }`.
  for (const match of source.matchAll(
    /:(?:active|hover)\b[^{};]*\{[^}]*?(?<![\w-])(?:transform|scale|translate|rotate)\s*:(?!\s*none\b)[^;}]+/g,
  ))
    add(match.index, match[0]);
  for (const match of source.matchAll(/<(?:Transition|TransitionGroup|transition|transition-group)\b([^>]*)>/g))
    if (/(?<![\w-])-?(?:translate|scale|rotate)-|transition-(?:transform|all)\b|move-class/.test(match[1]!))
      add(match.index, match[0]);
  for (const match of source.matchAll(/\.animate\(/g))
    if (
      /\b(?:transform|translate|scale|rotate|width|height|clipPath|clip-path|inset|left|top)\b/.test(
        balanced(source, match.index + match[0].length - 1),
      )
    )
      add(match.index, match[0]);
  const writesStyle =
    /\.style\.\w+\s*=|\.style\.setProperty\(|\.setAttribute\(\s*["'`](?:transform|d|style|width|height|x|y|cx|cy|r)["'`]/.test(
      source,
    );
  for (const match of source.matchAll(/requestAnimationFrame\(\s*(\w+)\s*\)/g))
    if (writesStyle && selfScheduling(source, match[1]!)) add(match.index, match[0]);
  return findings.toSorted((a, b) => a.line - b.line);
}

function scanSurfaces(): Finding[] {
  const files = surfaces
    .flatMap((surface) => walk(join(root, surface)))
    .map((file) => relative(root, file))
    .filter((path) => !ownMotionFigures.some((figure) => path.startsWith(figure.path)))
    .toSorted();
  const texts = files.map((path) => [path, readFileSync(join(root, path), "utf8")] as const);
  const keyframes = new Map([
    ["spin", false],
    ["pulse", false],
  ]);
  for (const [file, text] of texts)
    for (const match of withoutComments(file, text).matchAll(/@keyframes\s+([\w-]+)\s*\{/g))
      keyframes.set(
        match[1]!,
        keyframesMove(balanced(match.input, match.index + match[0].length - 1)),
      );
  return texts.flatMap(([path, text]) => scan(path, text, keyframes));
}

describe("motion", () => {
  it("has no hand-written motion outside the motion layer and the own-motion figures", () => {
    const found = scanSurfaces().map((finding) => `${finding.file}:${finding.line} ${finding.text}`);
    expect(
      found,
      `${found.length} × hand-written motion. Use the motion layer, which comark-motion runs, or a motion helper from window.__comarkMotion. See packages/motion/docs/index.md.\n${found.join("\n")}`,
    ).toEqual([]);
  });

  it("gives every own-motion figure a reason and a file that exists", () => {
    for (const figure of ownMotionFigures) {
      expect(figure.reason.length, figure.path).toBeGreaterThan(40);
      expect(() => statSync(join(root, figure.path)), figure.path).not.toThrow();
    }
  });
});
