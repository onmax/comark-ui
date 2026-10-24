import { basename, dirname, join, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import type { Diagnostic } from "./index.ts";
import { checkUrls, isTls, type UrlOptions } from "./urls.ts";
import { closest, decode, listIds } from "./words.ts";

/**
 * A string is a host (`example.com`), its subdomains (`*.example.com`), a host and port (`example.com:8080`), or a host
 * and path prefix (`example.com/docs`). A RegExp is tested against the link as written. A function gets the URL,
 * resolved against the document for a relative link.
 */
export type Pattern = string | RegExp | ((url: URL) => boolean);

/**
 * Where a root-relative link such as `/guide/setup/` finds its file. A record maps URL prefixes to folders from
 * `root`; the longest matching prefix wins. A function returns the path from `root`, `true` when the page exists but
 * isn't a Markdown file to check anchors in, or undefined when nothing serves it.
 */
export type Routes =
  | Readonly<Record<string, string | readonly string[]>>
  | ((path: string) => string | true | undefined);

export type LinkOptions = {
  /** Where root-relative links resolve. Default: from `root`, as GitHub resolves them. */
  routes?: Routes;
  /** Links that skip every check, the built-in block list included. */
  skip?: readonly Pattern[];
  /** When set, every external host it doesn't match is reported. */
  allow?: readonly Pattern[];
  /** Added to the built-in list of local, private, tunnel, and preview URLs; `false` turns that list off. */
  block?: readonly Pattern[] | false;
  /** Request every external URL and report dead ones. Off by default, since it needs the network. */
  urls?: boolean | UrlOptions;
};

/** File access, by absolute path. Each one defaults to node:fs. */
export type Files = {
  read(path: string): Promise<string | undefined>;
  exists(path: string): Promise<boolean>;
  list(path: string): Promise<readonly string[] | undefined>;
};

/** One `href` or `src` in a document, placed where the source writes it. */
export type Link = { key: string; value: string; line: number; column: number };

export type Context = {
  root: string;
  files: Files;
  links: LinkOptions;
  /** The ids in a Markdown file, or undefined when it can't be read or parsed. */
  ids(path: string): Promise<Set<string> | undefined>;
};

/** An external URL waiting for its network check. */
export type Pending = { url: string; link: Link; found: Diagnostic[] };

type Kind = "local" | "private" | "file" | "tunnel" | "preview";

const TUNNELS = [
  "ngrok.io",
  "ngrok.app",
  "ngrok.dev",
  "ngrok-free.app",
  "ngrok-free.dev",
  "trycloudflare.com",
  "loca.lt",
];
// Only the hosts that are previews by their shape: annotationkit.vercel.app and mysite.netlify.app are production.
const PREVIEWS = [
  /^(?:deploy-preview-\d+|agent-[\da-f]{24}|[\da-f]{24})--[\da-z-]+\.netlify\.app$/,
  /^[\da-z-]+-git-[\da-z-]+\.vercel\.app$/,
];

const under = (host: string, domain: string) => host === domain || host.endsWith(`.${domain}`);

function builtIn(url: URL): Kind | undefined {
  if (url.protocol === "file:") return "file";
  if (url.protocol !== "http:" && url.protocol !== "https:") return undefined;
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  const ip = /^(\d+)\.(\d+)\.\d+\.\d+$/.exec(host)?.slice(1).map(Number);
  if (under(host, "localhost") || host === "[::1]" || host === "[::]" || ip?.[0] === 127)
    return "local";
  if (ip?.[0] === 0) return "local";
  if (
    (ip &&
      (ip[0] === 10 || (ip[0] === 192 && ip[1] === 168) || (ip[0] === 169 && ip[1] === 254))) ||
    (ip?.[0] === 172 && ip[1]! >= 16 && ip[1]! <= 31) ||
    /^\[(?:f[cd]|fe[89ab])/.test(host) ||
    /\.(?:local|internal)$/.test(host)
  )
    return "private";
  if (TUNNELS.some((domain) => under(host, domain))) return "tunnel";
  if (PREVIEWS.some((preview) => preview.test(host))) return "preview";
  return undefined;
}

const HOST = /^(\*\.)?(\[[^\]]+\]|[^/:]+)(?::(\d+))?(\/.*)?$/;

function matches(pattern: Pattern, written: string, url: URL | undefined): boolean {
  if (pattern instanceof RegExp) {
    pattern.lastIndex = 0;
    return pattern.test(written);
  }
  if (pattern instanceof Function) return url !== undefined && pattern(url);
  if (!url || (url.protocol !== "http:" && url.protocol !== "https:")) return false;
  const parts = HOST.exec(pattern.trim().replace(/^[a-z]+:\/\//i, ""));
  if (!parts) return false;
  const [, wildcard, host = "", port, path] = parts;
  const hostname = url.hostname.toLowerCase();
  if (wildcard ? !hostname.endsWith(`.${host.toLowerCase()}`) : hostname !== host.toLowerCase())
    return false;
  if (port && port !== (url.port || (url.protocol === "https:" ? "443" : "80"))) return false;
  return (
    !path ||
    url.pathname === path ||
    url.pathname.startsWith(path.endsWith("/") ? path : `${path}/`)
  );
}

const isMarkdown = (path: string) => /\.mdc?$/i.test(path);

const subject = ({ key, value }: Link) =>
  key === "src" ? `The image \`${value}\`` : `The link to \`${value}\``;

const BLOCKED: Record<Kind, string> = {
  local: "points at the writer's own machine, so it opens nothing for anyone else",
  private: "points at a private network address, which only opens inside that network",
  file: "is a `file:` URL, which points at the writer's own disk",
  tunnel:
    "goes through a tunnel to the writer's machine, which stops working when the tunnel closes",
  preview: "is a deploy preview, which goes away or changes once its branch merges",
};

/**
 * Checks one document's links in order: `skip`, then the block lists, then `allow`, then the file a local link points
 * at. External URLs left for the network check go to `pending`.
 */
export async function checkLinks(
  links: readonly Link[],
  file: string | undefined,
  context: Context,
  found: Diagnostic[],
  pending: Pending[],
): Promise<void> {
  const { skip = [], allow, block = [] } = context.links;
  for (const link of links) {
    const { value, line, column } = link;
    if (!value || value.startsWith("#")) continue;
    const scheme = /^([a-z][\d+.a-z-]*):/i.exec(value)?.[1]?.toLowerCase();
    const absolute = scheme ? value : value.startsWith("//") ? `https:${value}` : undefined;
    let url: URL | undefined;
    try {
      url = new URL(absolute ?? value, file ? pathToFileURL(file) : "file:///");
    } catch {
      url = undefined;
    }
    if (skip.some((pattern) => matches(pattern, value, url))) continue;
    const at = { line, column };
    if (block && block.some((pattern) => matches(pattern, value, url))) {
      found.push({
        rule: "comark/blocked-url",
        ...at,
        message: `${subject(link)} on line ${line} matches \`links.block\`.`,
        fix: "Link another page, or take the pattern out of `links.block`.",
      });
      continue;
    }
    const kind = absolute && url && block !== false ? builtIn(url) : undefined;
    if (kind) {
      found.push({
        rule: "comark/blocked-url",
        ...at,
        message: `${subject(link)} on line ${line} ${BLOCKED[kind]}.`,
        fix:
          kind === "preview"
            ? "Link the production page instead, or add the URL to `links.skip` if the preview is meant to stay."
            : `Link the deployed page, or write the address as code (\`\` \`${value}\` \`\`). Comark turns a bare URL in prose into a link.`,
      });
      continue;
    }
    const web = url && (url.protocol === "http:" || url.protocol === "https:");
    if (absolute && web && allow && !allow.some((pattern) => matches(pattern, value, url))) {
      found.push({
        rule: "comark/blocked-url",
        ...at,
        message: `${subject(link)} on line ${line} goes to \`${url!.host}\`, which \`links.allow\` doesn't list.`,
        fix: `Link a page on an allowed host, or add \`${url!.host}\` to \`links.allow\`.`,
      });
      continue;
    }
    if (absolute) {
      if (web) pending.push({ url: url!.href.replace(/#.*$/, ""), link, found });
      continue;
    }
    if (file) await checkLocal(link, file, context, found);
  }
}

type Target = { found: string | true } | { missing: string[]; routed: boolean };

async function checkLocal(link: Link, file: string, context: Context, found: Diagnostic[]) {
  const { value, line, column } = link;
  const [, written = "", fragment] = /^([^?#]*)(?:\?[^#]*)?(?:#(.*))?$/.exec(value) ?? [];
  if (!written) return;
  const path = decode(written);
  const target = await locate(path, file, context);
  const display = (absolute: string) => relative(context.root, absolute).split(sep).join("/");
  if ("missing" in target) {
    const guess = await suggest(target.missing, written, context.files);
    const where = target.missing[0];
    const rooted = path.startsWith("/");
    found.push({
      rule: "comark/broken-link",
      line,
      column,
      message: where
        ? `${subject(link)} on line ${line} points at \`${display(where)}\`, which doesn't exist.`
        : `${subject(link)} on line ${line} matches no route in \`links.routes\`.`,
      fix: [
        guess ? `Did you mean \`${guess}\`?` : "Fix the path, or add the missing file.",
        rooted && !target.routed
          ? `If your site serves \`${written}\` from another folder than the project root, map it in \`links.routes\`.`
          : "",
        rooted && target.routed && !where
          ? `Add a route for \`${written}\` to \`links.routes\`.`
          : "",
      ]
        .filter(Boolean)
        .join(" "),
    });
    return;
  }
  if (!fragment || target.found === true || !isMarkdown(target.found)) return;
  const ids = await context.ids(target.found);
  const id = decode(fragment);
  if (!ids || ids.has(id) || ids.has(fragment)) return;
  const guess = closest(id, [...ids]);
  found.push({
    rule: "comark/broken-anchor",
    line,
    column,
    message: `The link to \`${value}\` on line ${line} matches no heading or id in \`${display(target.found)}\`.`,
    fix: `${guess ? `Did you mean \`#${guess}\`? ` : ""}${listIds(ids, "Ids there", "That document has no headings or ids.")}`,
  });
}

async function locate(path: string, file: string, context: Context): Promise<Target> {
  const { root, links, files } = context;
  const slash = path.endsWith("/");
  if (!path.startsWith("/")) return pick([resolve(dirname(file), path)], slash, files, false);
  const { routes } = links;
  if (!routes) return pick([join(root, path)], slash, files, false);
  if (routes instanceof Function) {
    const routed = routes(path);
    if (routed === true) return { found: true };
    if (!routed) return { missing: [], routed: true };
    return pick([resolve(root, routed)], routed.endsWith("/") || slash, files, true);
  }
  const trim = (prefix: string) => prefix.replace(/\/+$/, "");
  const prefix = Object.keys(routes)
    .sort((a, b) => b.length - a.length)
    .find((candidate) => {
      const base = trim(candidate);
      return !base || path === base || path.startsWith(`${base}/`);
    });
  if (prefix === undefined) return { missing: [], routed: true };
  const rest = path.slice(trim(prefix).length).replace(/^\/+/, "");
  const folders = [routes[prefix]!].flat();
  return pick(
    folders.map((folder) => join(root, folder, rest)),
    slash,
    files,
    true,
  );
}

// A site serves `/guide/setup/` from `setup.md` or `setup/index.md`, so both count. Markdown wins, since only a
// Markdown file has anchors to check.
async function pick(
  bases: string[],
  slash: boolean,
  files: Files,
  routed: boolean,
): Promise<Target> {
  for (const folder of bases) {
    const base = folder.replace(/(?<=.)[/\\]+$/, "");
    const candidates = slash
      ? [join(base, "index.md"), `${base}.md`, base]
      : [base, `${base}.md`, join(base, "index.md")];
    for (const candidate of [
      ...candidates.filter(isMarkdown),
      ...candidates.filter((candidate) => !isMarkdown(candidate)),
    ])
      if (await files.exists(candidate)) return { found: candidate };
  }
  return { missing: bases, routed };
}

// The last segment is the likeliest typo, so it's the one compared with what its folder holds.
async function suggest(
  bases: string[],
  written: string,
  files: Files,
): Promise<string | undefined> {
  for (const base of bases) {
    const entries = await files.list(dirname(base));
    if (!entries) continue;
    const name = basename(base);
    const plain = !/\.[^.]+$/.test(name);
    const guess = closest(
      name,
      entries
        .filter((entry) => !entry.startsWith("."))
        .map((entry) => (plain ? entry.replace(/\.mdc?$/, "") : entry)),
    );
    if (guess && guess !== name) return written.replace(/[^/]*(\/?)$/, `${guess}$1`);
  }
  return undefined;
}

/** Requests every pending URL once and reports the dead ones. */
export async function checkPending(
  pending: readonly Pending[],
  options: true | UrlOptions,
  root: string,
): Promise<void> {
  if (!pending.length) return;
  const answers = await checkUrls([...new Set(pending.map(({ url }) => url))], options, root);
  if (!answers) return;
  for (const { url, link, found } of pending) {
    const answer = answers.get(url);
    if (!answer) continue;
    const { line, column } = link;
    const start = `${subject(link)} on line ${line}`;
    if ("status" in answer) {
      if (answer.status !== 404 && answer.status !== 410) continue;
      found.push({
        rule: "comark/dead-url",
        line,
        column,
        message: `${start} answers ${answer.status} ${answer.status === 404 ? "Not Found" : "Gone"}.`,
        fix: `Link the page where it moved, or its archived copy (\`https://web.archive.org/web/${url}\`). If the page is there and the site answers ${answer.status} anyway, add the URL to \`links.skip\`.`,
      });
    } else if (answer.code === "ENOTFOUND") {
      found.push({
        rule: "comark/dead-url",
        line,
        column,
        message: `${start} goes to \`${new URL(url).hostname}\`, which has no DNS record.`,
        fix: "Check the host's spelling, or link where the site moved. If it only resolves on your network, add it to `links.skip`.",
      });
    } else if (isTls(answer.code)) {
      found.push({
        rule: "comark/dead-url",
        line,
        column,
        message: `${start} fails its TLS check (\`${answer.code}\`), so browsers show a warning instead of the page.`,
        fix: "Link an address with a valid certificate, or add the URL to `links.skip` if readers should see the warning.",
      });
    }
  }
}
