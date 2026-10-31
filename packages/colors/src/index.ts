import type { ElementNode, Node } from "comark";
import { defineComarkPlugin } from "comark";
import { textContent } from "comark/utils";
import { childrenOf, isElement } from "../../../shared/nodes.ts";

export type ColorsMeta = {
  /** One readable sentence per problem with a `::palette`. Empty when the document has none. Other plugins add theirs too. */
  issues: string[];
  /** The comark-linter rule of each issue, by its sentence, so the linter reports it under its own code. */
  issueRules: Record<string, string>;
};

type Issue = { rule: `comark/colors/${string}`; message: string };

/**
 * What a color becomes, and all its renderers read. Inline code that holds a color has only `value`; a `::palette` line
 * has its `name` too.
 */
export type ColorAttributes = { value?: string; name?: string };

const NUMBER = String.raw`[+-]?(?:\d+(?:\.\d+)?|\.\d+)(?:e[+-]?\d+)?`;
const PERCENT = String.raw`${NUMBER}%`;
const ANGLE = String.raw`${NUMBER}(?:deg|grad|rad|turn)`;
const NONE = String.raw`none`;
// CSS comments are whitespace, but quotes stay excluded so a comment cannot break the style attribute.
const CSS_WS = String.raw`(?:[ \t\r\n\f]|/\*(?:[^"'<>]|\r?\n)*?\*/)`;
const ALPHA = String.raw`(?:${NUMBER}|${PERCENT}|${NONE})`;
const RGB_CHANNEL = String.raw`(?:${NUMBER}|${PERCENT}|${NONE})`;
const HSL_HUE = String.raw`(?:${NUMBER}|${ANGLE}|${NONE})`;
const HSL_PERCENT = String.raw`(?:${PERCENT}|${NONE})`;
const LAB_CHANNEL = String.raw`(?:${NUMBER}|${PERCENT}|${NONE})`;
const LEGACY_RGB = String.raw`(?:${NUMBER}${CSS_WS}*,${CSS_WS}*${NUMBER}${CSS_WS}*,${CSS_WS}*${NUMBER}|${PERCENT}${CSS_WS}*,${CSS_WS}*${PERCENT}${CSS_WS}*,${CSS_WS}*${PERCENT})(?:${CSS_WS}*,${CSS_WS}*(?:${NUMBER}|${PERCENT}))?`;
const LEGACY_HSL = String.raw`(?:${NUMBER}|${ANGLE})`;
const MODERN = (a: string, b: string, c: string) =>
  String.raw`${a}${CSS_WS}+${b}${CSS_WS}+${c}(?:${CSS_WS}*/${CSS_WS}*${ALPHA})?`;
// Only characters a color needs, so a value can't close the style attribute it's written into or add a declaration.
const COLOR = new RegExp(
  String.raw`^(?:#(?:[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})|(?:rgb|rgba)\(${CSS_WS}*(?:${MODERN(RGB_CHANNEL, RGB_CHANNEL, RGB_CHANNEL)}|${LEGACY_RGB})${CSS_WS}*\)|(?:hsl|hsla)\(${CSS_WS}*(?:${MODERN(HSL_HUE, HSL_PERCENT, HSL_PERCENT)}|${LEGACY_HSL}${CSS_WS}*,${CSS_WS}*${PERCENT}${CSS_WS}*,${CSS_WS}*${PERCENT}(?:${CSS_WS}*,${CSS_WS}*(?:${NUMBER}|${PERCENT}))?)${CSS_WS}*\)|hwb\(${CSS_WS}*${MODERN(HSL_HUE, HSL_PERCENT, HSL_PERCENT)}${CSS_WS}*\)|lab\(${CSS_WS}*${MODERN(LAB_CHANNEL, LAB_CHANNEL, LAB_CHANNEL)}${CSS_WS}*\)|lch\(${CSS_WS}*${MODERN(LAB_CHANNEL, LAB_CHANNEL, HSL_HUE)}${CSS_WS}*\)|oklab\(${CSS_WS}*${MODERN(LAB_CHANNEL, LAB_CHANNEL, LAB_CHANNEL)}${CSS_WS}*\)|oklch\(${CSS_WS}*${MODERN(LAB_CHANNEL, LAB_CHANNEL, HSL_HUE)}${CSS_WS}*\))$`,
  "i",
);
const EXAMPLE = "`- Primary: #3b82f6`";

/** Whether `value` is a hex, rgb(), hsl(), hwb(), lab(), lch(), oklab(), or oklch() color. */
export const isColor = (value: string) => COLOR.test(value);

// Comments render nothing, so they aren't content a palette would drop.
const isContent = (node: Node) => (Array.isArray(node) ? node[0] !== null : node.trim() !== "");

function palette(node: ElementNode, number: number, issues: Issue[]): ElementNode {
  const name = `\`::palette\` ${number}`;
  for (const key of Object.keys(node[1])) {
    const prop = key.replace(/^:/, "");
    if (prop !== "id" && prop !== "class")
      issues.push({
        rule: "comark/colors/unknown-prop",
        message: `${name}: \`${prop}\` isn't a prop of \`::palette\`, which has none, so it's ignored. Remove it.`,
      });
  }
  const content = childrenOf(node).filter(isContent);
  const lists = content.filter(
    (child): child is ElementNode => isElement(child) && (child[0] === "ul" || child[0] === "ol"),
  );
  if (!lists.length) {
    issues.push({
      rule: "comark/colors/missing-list",
      message: `${name} needs a list of \`name: color\` lines, such as ${EXAMPLE}.`,
    });
    return ["palette", {}];
  }
  if (lists.length < content.length)
    issues.push({
      rule: "comark/colors/content-dropped",
      message: `${name} drops everything but its list. Move the rest outside the block.`,
    });
  const colors: ElementNode[] = [];
  for (const item of lists.flatMap(childrenOf).filter(isElement)) {
    const line = textContent(item).trim();
    const [, label, value = ""] = /^(.*\S)\s*:\s*(\S.*)$/s.exec(line) ?? [];
    if (!label)
      issues.push({
        rule: "comark/colors/unreadable-line",
        message: `${name}: "${line}" needs a name and a color, such as ${EXAMPLE}.`,
      });
    else if (!isColor(value.trim()))
      issues.push({
        rule: "comark/colors/invalid-color",
        message: `${name}: "${value.trim()}" for ${label} isn't a color it can draw. Write a hex color or an rgb(), hsl(), hwb(), lab(), lch(), oklab(), or oklch() color.`,
      });
    else colors.push(["color", { name: label, value: value.trim() }]);
  }
  return ["palette", {}, ...colors];
}

/**
 * Puts a swatch before inline code that holds a color, such as `#3b82f6` or `oklch(0.62 0.19 260)`, and turns a
 * `::palette` of `name: color` lines into a grid of swatches. Problems are added to `meta.issues`.
 */
export default defineComarkPlugin<void, ColorsMeta>(() => ({
  name: "comark-colors",
  post(state) {
    const { tree } = state;
    const issues: Issue[] = [];
    let count = 0;
    const walk = (nodes: Node[], start: number) => {
      for (let index = start; index < nodes.length; index++) {
        const node = nodes[index];
        if (!node || !isElement(node) || node[0] === "pre") continue;
        if (node[0] === "palette") nodes[index] = palette(node, ++count, issues);
        else if (node[0] !== "code")
          // SAFETY: an element node is [tag, attributes, ...children], so its items from index 2 are nodes.
          walk(node as Node[], 2);
        else {
          const [value, ...rest] = childrenOf(node);
          if (value !== undefined && !Array.isArray(value) && !rest.length && isColor(value.trim()))
            nodes[index] = ["color", { value: value.trim() }];
        }
      }
    };
    walk(tree.nodes, 0);
    tree.meta.issues = [...(tree.meta.issues ?? []), ...issues.map((issue) => issue.message)];
    tree.meta.issueRules = {
      ...tree.meta.issueRules,
      ...Object.fromEntries(issues.map((issue) => [issue.message, issue.rule])),
    };
  },
}));
