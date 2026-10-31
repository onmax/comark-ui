import type { ElementNode, Node } from "comark";
import { defineComarkPlugin } from "comark";
import { resolveAttributes } from "comark/render";
import {
  createIcons,
  describeIconProblem,
  iconProblemRule,
  type IconOptions,
  type Icons,
} from "./resolve.ts";
import { text } from "../../../shared/text.ts";
import { childrenOf, isElement } from "../../../shared/nodes.ts";

export {
  createIcons,
  describeIconProblem,
  iconProblemRule,
  parseIconName,
  type IconData,
  type IconCollection,
  type IconOptions,
  type IconProblem,
  type IconRule,
  type Icons,
} from "./resolve.ts";

export type IconMeta = {
  /** One readable sentence per problem with an `:icon`. Other plugins add theirs too. */
  issues: string[];
  /** The comark-linter rule of each issue, by its sentence, so the linter reports it under its own code. */
  issueRules: Record<string, string>;
};

type Issue = { rule: `comark/icon/${string}`; message: string };

/** The node an icon is. After parsing, its attributes are `name`, `src`, `ratio`, `mask`, and `label`. */
export const ICON_TAG = "icon";

const PROPS = ["name", "label", "id", "class"];

function collect(nodes: Node[], found: { node: ElementNode; parent: Node[] }[]) {
  for (const node of nodes) {
    if (!isElement(node)) continue;
    if (node[0] === ICON_TAG) found.push({ node, parent: nodes });
    else collect(childrenOf(node), found);
  }
}

/**
 * Draws `:icon{name="lucide:apple"}`, an Iconify name or an image URL, as a CSS image with no script. Icons are
 * resolved while parsing, from `collections` or else the Iconify API. An icon it can't draw is left out, and its
 * problem added to `meta.issues`. Pass an `Icons` from `createIcons()` to share one with other plugins.
 */
export default /* @__PURE__ */ defineComarkPlugin<IconOptions | Icons, IconMeta>((options) => {
  const icons = options && "resolve" in options ? options : createIcons(options);
  return {
    name: "comark-icon",
    async post(state) {
      const { tree } = state;
      const found: { node: ElementNode; parent: Node[] }[] = [];
      collect(tree.nodes, found);
      if (!found.length) return;
      const data = { frontmatter: tree.frontmatter, meta: tree.meta, data: {}, props: {} };
      const props = found.map(({ node }) => resolveAttributes(node[1], data, { parseJson: true }));
      const resolved = await icons.resolve(props.map((attrs) => text(attrs.name)));
      const issues: Issue[] = [];
      for (const [index, { node, parent }] of found.entries()) {
        const name = text(props[index].name);
        const icon = resolved.get(name);
        const where = `\`:icon\` ${index + 1}`;
        for (const key of Object.keys(node[1])) {
          const prop = key.replace(/^:/, "");
          if (!PROPS.includes(prop))
            issues.push({
              rule: "comark/icon/unknown-prop",
              message: `${where}: \`${prop}\` isn't a prop of \`:icon\`, so it's ignored. Use \`name\` or \`label\`.`,
            });
        }
        if (!name)
          issues.push({
            rule: "comark/icon/missing-name",
            message: `${where}: \`name\` is required. Write \`:icon{name="lucide:apple"}\`.`,
          });
        else if (icon && "problem" in icon)
          issues.push({
            rule: iconProblemRule(icon),
            message: `${where} ("${name}"): ${describeIconProblem(name, icon)}`,
          });
        if (!name || !icon || "problem" in icon) {
          parent.splice(parent.indexOf(node), 1);
          continue;
        }
        const label = text(props[index].label);
        node[1] = {
          name,
          src: icon.src,
          ratio: String(icon.ratio),
          ...(icon.mask && { mask: "true" }),
          ...(label && { label }),
        };
        node.splice(2);
      }
      tree.meta.issues = [...(tree.meta.issues ?? []), ...issues.map((issue) => issue.message)];
      tree.meta.issueRules = {
        ...tree.meta.issueRules,
        ...Object.fromEntries(issues.map((issue) => [issue.message, issue.rule])),
      };
    },
  };
});
