import type { ElementNode, Node } from "comark";
import { defineComarkPlugin } from "comark";
import { textContent } from "comark/utils";
import { type Image, inline } from "./images.ts";
import { text } from "../../../shared/text.ts";
import { childrenOf, isElement } from "../../../shared/nodes.ts";

export interface ChipsOptions {
  /** Download each image while parsing and inline it, so readers' browsers ask no other site. `false` keeps the URLs. */
  download?: boolean;
  /** The image URL of a site, by its host. Google's favicon service by default. */
  favicon?: (host: string) => string;
  /** The image URL of a GitHub account, for `@user` and for links into it. Its GitHub avatar by default. */
  avatar?: (login: string) => string;
  /**
   * The folder that keeps downloaded images between builds. `node_modules/.cache/comark-chips` by default; a folder you
   * commit keeps CI from downloading at all. `false` keeps them in memory, once per process.
   */
  cache?: string | false;
}

export type ChipsMeta = {
  /** One readable sentence per problem with a chip. Other plugins add theirs too. */
  issues: string[];
  /** The comark-linter rule of each issue, by its sentence, so the linter reports it under its own code. */
  issueRules: Record<string, string>;
};

type Issue = { rule: `comark/chips/${string}`; message: string };

/** The node a chip is. After parsing, its attributes are `href`, `kind` (`avatar` or `favicon`), `src`, and `title`. */
export const CHIP_TAG = "chip";

const LOGIN = "[a-z\\d](?:[a-z\\d]|-(?=[a-z\\d])){0,38}";
// `@user`, not inside a word, a path, or an email address. A name followed by a slash is an npm scope such as
// `@comark/html`, so it isn't a mention.
const MENTION = new RegExp(`(?<![\\w/.@#-])@(${LOGIN})(?![\\w/-])`, "gi");
const words = (list: string) => new Set(list.split(" "));
// A link into an account shows its avatar: GitHub's from GitHub, the others' through unavatar.io under the provider's
// name there. The sets are pages at that place that aren't an account.
const PROFILES: [provider: string, pattern: RegExp, routes?: Set<string>][] = [
  [
    "github",
    new RegExp(`^https?://github\\.com/(${LOGIN})(?:[/?#]|$)`, "i"),
    words(
      "about apps collections enterprise explore features issues login marketplace new notifications orgs organizations pricing pulls search settings sponsors topics trending",
    ),
  ],
  [
    "x",
    /^https?:\/\/(?:www\.)?(?:x|twitter)\.com\/(\w{1,15})(?:[/?#]|$)/i,
    words(
      "compose explore hashtag home i intent login messages notifications privacy search settings share signup tos",
    ),
  ],
  [
    "bluesky",
    /^https?:\/\/bsky\.app\/profile\/((?:[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?\.)+[a-z](?:[a-z\d-]{0,61}[a-z\d])?)(?:[/?#]|$)/i,
  ],
  [
    "youtube",
    /^https?:\/\/(?:www\.)?youtube\.com\/@([a-z\d](?:[a-z\d_.-]{1,28}[a-z\d]))(?:[/?#]|$)/i,
  ],
  [
    "gitlab",
    /^https?:\/\/gitlab\.com\/([a-z\d](?:[a-z\d_.-]{0,253}[a-z\d_-]))\/?(?:[?#]|$)/i,
    words("dashboard explore help projects search users"),
  ],
];
const NAMES = new Map([
  ["github", "GitHub login"],
  ["x", "X handle"],
  ["bluesky", "Bluesky handle"],
  ["youtube", "YouTube handle"],
  ["gitlab", "GitLab username"],
]);
// `avatar="bluesky:name"` names an account on any network unavatar.io knows; a URL has `//` after its scheme.
const NAMED = /^([a-z][a-z\d-]*):(?!\/\/)(\S+)$/i;
// Text in these is a link, a chip, or code already, so it stays as written.
const SKIP = new Set(["a", CHIP_TAG, "code", "pre", "script", "style"]);
const WEB = /^https?:\/\//i;
const BARE_LOGIN = new RegExp(`^${LOGIN}$`, "i");

const hasImage = (nodes: Node[]): boolean =>
  nodes.some((node) => isElement(node) && (node[0] === "img" || hasImage(childrenOf(node))));
/** Remove interactive chip descendants before making their parent interactive. */
function flattenChips(nodes: Node[]) {
  for (const node of nodes) {
    if (!isElement(node)) continue;
    if (node[0] === CHIP_TAG) node[0] = "span";
    else flattenChips(childrenOf(node));
  }
}

const favicon = (host: string) =>
  `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64`;
const githubAvatar = (login: string) => `https://github.com/${login}.png?size=64`;
// Without `fallback=false`, an account that doesn't exist gets a placeholder face instead of a 404 to report.
const unavatar = ({ provider, login }: Account) =>
  `https://unavatar.io/${provider}/${encodeURIComponent(login)}?fallback=false`;

type Account = { provider: string; login: string };
function profile(href: string): Account | undefined {
  for (const [provider, pattern, routes] of PROFILES) {
    const login = pattern.exec(href)?.[1];
    if (login && !routes?.has(login.toLowerCase())) return { provider, login };
  }
}
function named(avatar: string): Account | undefined {
  if (avatar.startsWith("@")) return { provider: "github", login: avatar.slice(1) };
  const [, provider, login] = NAMED.exec(avatar) ?? [];
  if (provider && login) return { provider: provider.toLowerCase(), login };
}

function mentions(value: string, found: Map<ElementNode, string>): Node[] {
  const nodes: Node[] = [];
  let last = 0;
  for (const match of value.matchAll(MENTION)) {
    const [whole, login = ""] = match;
    if (match.index > last) nodes.push(value.slice(last, match.index));
    const chip: ElementNode = [CHIP_TAG, { href: `https://github.com/${login}` }, login];
    found.set(chip, `\`${whole}\``);
    nodes.push(chip);
    last = match.index + whole.length;
  }
  if (!last) return [value];
  if (last < value.length) nodes.push(value.slice(last));
  return nodes;
}

// A link's own text is kept, with two exceptions: a bare URL loses its scheme, and a mention its `@`, since the image
// says where it goes.
function label(node: ElementNode, href: string) {
  const shown = textContent(node).trim();
  if (shown === href) node.splice(2, node.length - 2, href.replace(WEB, "").replace(/\/$/, ""));
  const login = profile(href)?.login;
  if (login && shown.toLowerCase() === `@${login.toLowerCase()}`)
    node.splice(2, node.length - 2, shown.slice(1));
}

function collect(nodes: Node[], start: number, found: Map<ElementNode, string>) {
  for (let index = nodes.length - 1; index >= start; index--) {
    const node = nodes[index];
    if (!Array.isArray(node)) {
      nodes.splice(index, 1, ...mentions(node, found));
      continue;
    }
    if (!isElement(node)) continue;
    const [tag, attrs] = node;
    if (attrs.$?.html) continue;
    const href = text(attrs.href);
    if (tag === "a" && WEB.test(href)) {
      if (text(attrs.chip) === "false") delete attrs.chip;
      else if (!hasImage(childrenOf(node))) {
        try {
          new URL(href);
        } catch {
          found.set(node, `[${textContent(node).trim()}](${href})`);
          continue;
        }
        flattenChips(childrenOf(node));
        node[0] = CHIP_TAG;
        label(node, href);
        found.set(node, `[${textContent(node).trim()}](${href})`);
      }
      continue;
    }
    if (tag === CHIP_TAG) {
      found.set(node, `\`:chip\` [${textContent(node).trim()}](${href})`);
      continue;
    }
    if (SKIP.has(tag)) continue;
    // SAFETY: an element node is [tag, attributes, ...children], so its children start at index 2.
    collect(node as Node[], 2, found);
  }
}

/**
 * Turns every web link into a chip with the site's favicon, and every `@user` into a chip with their GitHub avatar.
 * A link into a GitHub, X, Bluesky, YouTube, or GitLab account shows its avatar too. On a link, `{avatar="https://…"}`,
 * `{avatar="@user"}`, or `{avatar="bluesky:name"}` for any network unavatar.io knows sets the image, and
 * `{chip=false}` keeps a plain link. Images are downloaded while parsing, inlined, and kept in the `cache` folder; one
 * that can't be downloaded is left for the reader's browser to load.
 */
export default defineComarkPlugin<ChipsOptions | undefined, ChipsMeta>((options) => {
  const siteImage = options?.favicon ?? favicon;
  const accountImage = options?.avatar ?? githubAvatar;
  return {
    name: "comark-chips",
    async post(state) {
      const { tree } = state;
      const found = new Map<ElementNode, string>();
      collect(tree.nodes, 0, found);
      if (!found.size) return;
      const issues: Issue[] = [];
      const chips = [...found].flatMap(([node, where]) => {
        const href = text(node[1].href);
        if (!WEB.test(href)) {
          issues.push({
            rule: "comark/chips/invalid-href",
            message: `${where}: \`href\` must be a web address, such as \`href="https://vite.dev"\`.`,
          });
          return [];
        }
        const custom = text(node[1].avatar);
        const account = custom ? named(custom) : profile(href);
        let host: string;
        try {
          host = new URL(href).host;
        } catch {
          issues.push({
            rule: "comark/chips/invalid-href",
            message: `${where}: \`href\` must be a valid web address.`,
          });
          return [];
        }
        const image = account
          ? account.provider === "github"
            ? accountImage(account.login)
            : unavatar(account)
          : custom || siteImage(host);
        // Only a bare login, the slip for `@login`, is reported: a path such as `/me.png` is an image on the site that serves it.
        if (custom && !account && BARE_LOGIN.test(custom))
          issues.push({
            rule: "comark/chips/invalid-avatar",
            message: `${where}: \`avatar="${custom}"\` is neither an image URL nor an account, so the chip shows a broken image. Write \`avatar="@${custom}"\` for a GitHub account, or \`avatar="https://…"\` for an image.`,
          });
        const kind = custom || account ? "avatar" : "favicon";
        return [{ node, where, href, image, kind, account }];
      });
      const images: Map<string, Image> =
        options?.download === false
          ? new Map(chips.map(({ image }) => [image, { src: image }]))
          : await inline(
              chips.map(({ image }) => image),
              options?.cache ?? "node_modules/.cache/comark-chips",
            );
      for (const { node, where, href, image, kind, account } of chips) {
        let result = images.get(image) ?? { src: image };
        if ("status" in result && result.status === 429) {
          issues.push({
            rule: "comark/chips/rate-limited",
            message: `${where}: ${new URL(image).host} turned the download away for now (HTTP 429), so readers' browsers load the image. Build again later; once downloaded, it's cached for a week.`,
          });
          result = { src: image };
        } else if ("status" in result && kind === "avatar")
          issues.push({
            rule: "comark/chips/missing-avatar",
            message: account
              ? `${where}: there's no avatar at ${image} (HTTP ${result.status}). Check the ${NAMES.get(account.provider) ?? `${account.provider} name`}, or set \`avatar\` to an image URL.`
              : `${where}: its \`avatar\` image answered HTTP ${result.status}. Fix the URL, or remove \`avatar\`.`,
          });
        const title = text(node[1].title);
        node[1] = {
          href,
          kind,
          ...("src" in result && { src: result.src }),
          ...(title && { title }),
        };
      }
      tree.meta.issues = [...(tree.meta.issues ?? []), ...issues.map((issue) => issue.message)];
      tree.meta.issueRules = {
        ...tree.meta.issueRules,
        ...Object.fromEntries(issues.map((issue) => [issue.message, issue.rule])),
      };
    },
  };
});
