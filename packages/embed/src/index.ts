import type { ElementNode, Node } from "comark";
import { defineComarkPlugin } from "comark";
import { resolveAttributes } from "comark/render";
import { hostOf, providerOf } from "./providers.ts";
import { text } from "../../../shared/text.ts";
import { childrenOf, isElement } from "../../../shared/nodes.ts";

export type { Size } from "./providers.ts";

export type EmbedMeta = {
  /** One readable sentence per problem with an `::embed`. Empty when the document has none. Other plugins add theirs too. */
  issues: string[];
  /** The comark-linter rule of each issue, by its sentence, so the linter reports it under its own code. */
  issueRules: Record<string, string>;
};

type Issue = { rule: `comark/embed/${string}`; message: string };

/**
 * What an `::embed` becomes, and all its renderers read. A player has `provider`, `src`, `label`, and `size`; a link
 * card has neither. Both have `href`, `title` (the block's own, or the host), and `host`. An embed without a usable
 * link has no attributes and renders nothing.
 */
export type EmbedAttributes = {
  provider?: string;
  src?: string;
  label?: string;
  size?: string;
  href?: string;
  title?: string;
  host?: string;
};

type Data = Parameters<typeof resolveAttributes>[1];

// Comments render nothing, so they aren't content an embed would drop.
const isContent = (node: Node) => (Array.isArray(node) ? node[0] !== null : node.trim() !== "");

const PROPS = ["url", "title", "start"];

function readUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname ? url : undefined;
  } catch {
    return undefined;
  }
}

function embed(node: ElementNode, number: number, data: Data, issues: Issue[]): EmbedAttributes {
  const name = `\`::embed\` ${number}`;
  const attrs = resolveAttributes(node[1], data, { parseJson: true });
  if (childrenOf(node).some(isContent))
    issues.push({
      rule: "comark/embed/content-dropped",
      message: `${name} drops the content inside it. Close the block with \`::\` on the line after it, and write text outside it.`,
    });
  for (const key of Object.keys(node[1])) {
    const prop = key.replace(/^:/, "");
    if (!PROPS.includes(prop) && prop !== "id" && prop !== "class")
      issues.push({
        rule: "comark/embed/unknown-prop",
        message: `${name}: \`${prop}\` isn't a prop of \`::embed\`, so it's ignored. Use \`url\`, \`title\`, or \`start\`.`,
      });
  }
  const raw = text(attrs.url);
  if (!raw) {
    issues.push({
      rule: "comark/embed/missing-url",
      message: `${name}: \`url\` is required. Write \`::embed{url="https://..."}\`.`,
    });
    return {};
  }
  const url = readUrl(raw);
  if (!url) {
    issues.push({
      rule: "comark/embed/insecure-url",
      message: `${name}: \`url\` must start with https://.`,
    });
    return {};
  }
  if (url.username || url.password) {
    issues.push({
      rule: "comark/embed/credentials-in-url",
      message: `${name}: \`url\` has a user name or password before the host. Remove the part up to and including \`@\`.`,
    });
    return {};
  }
  const provider = providerOf(url);
  const startText = text(attrs.start);
  const start =
    /^\d+$/.test(startText) && Number.isSafeInteger(Number(startText))
      ? Number(startText)
      : undefined;
  if (startText && start === undefined)
    issues.push({
      rule: "comark/embed/invalid-start",
      message: `${name}: \`start\` must be a whole number of seconds, such as \`start=90\`.`,
    });
  else if (startText && !provider?.seeks)
    issues.push({
      rule: "comark/embed/start-unsupported",
      message: `${name}: \`start\` only works for YouTube and Vimeo videos. Remove it.`,
    });
  const host = hostOf(url);
  const title = text(attrs.title);
  const card = { href: url.href, title: title || host, host };
  if (!provider) {
    if (!title)
      issues.push({
        rule: "comark/embed/card-without-title",
        message: `${name}: ${host} has no player, so this renders as a link card. Add \`title\` so readers know what it links to.`,
      });
    return card;
  }
  const player = provider.read(url, start);
  if ("hint" in player) {
    issues.push({
      rule: "comark/embed/unreadable-link",
      message: `${name}: can't read ${provider.holds} from ${url.href}. ${player.hint}`,
    });
    return card;
  }
  return { ...player, label: title || player.label, ...card };
}

/**
 * Turns `::embed{url="..."}` into a player for YouTube, Vimeo, Loom, Spotify, CodePen, StackBlitz, and Figma links,
 * read from the link alone, or a link card for any other https link. Problems are added to `meta.issues`.
 */
export default defineComarkPlugin<void, EmbedMeta>(() => ({
  name: "comark-embed",
  post(state) {
    const { tree } = state;
    const data: Data = { frontmatter: tree.frontmatter, meta: tree.meta, data: {}, props: {} };
    const issues: Issue[] = [];
    let count = 0;
    const walk = (nodes: Node[]) => {
      for (const node of nodes) {
        if (!isElement(node)) continue;
        if (node[0] !== "embed") {
          walk(childrenOf(node));
          continue;
        }
        // Only the normalized attributes, so no renderer reads the raw link, an `{#id .class}`, or the dropped content.
        node.splice(1, node.length - 1, embed(node, ++count, data, issues));
      }
    };
    walk(tree.nodes);
    tree.meta.issues = [...(tree.meta.issues ?? []), ...issues.map((issue) => issue.message)];
    tree.meta.issueRules = {
      ...tree.meta.issueRules,
      ...Object.fromEntries(issues.map((issue) => [issue.message, issue.rule])),
    };
  },
}));
