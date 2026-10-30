import type { ElementNode, Node } from "comark";
import { defineComarkPlugin } from "comark";
import { sanitizeSvg } from "./sanitize.ts";

export { sanitizeSvg } from "./sanitize.ts";

export interface DiagramsOptions {
  /** The Kroki server that draws the diagrams. Default `https://kroki.io`; set your own to keep diagram sources private. */
  server?: string;
  /** Draw diagrams. `false` leaves every fence as code and sends nothing, for linters and offline checks. Default `true`. */
  draw?: boolean;
}

export type DiagramsMeta = {
  /** One readable sentence per diagram that couldn't be drawn. Other plugins add theirs too. */
  issues: string[];
  /** The comark-linter rule of each issue, by its sentence, so the linter reports it under its own code. */
  issueRules: Record<string, string>;
};

type Rule = `comark/diagrams/${string}`;
type Issue = { rule: Rule; message: string };

/**
 * What a diagram fence becomes: the sanitized `svg`, the Kroki diagram `type` it was drawn as, and the fence's
 * `[title]` as its `label`, when it has one.
 */
export type DiagramAttributes = { type?: string; svg?: string; label?: string };

/** The fence languages the plugin draws, and the Kroki diagram type for each. */
export const LANGUAGES: Readonly<Record<string, string>> = {
  plantuml: "plantuml",
  graphviz: "graphviz",
  dot: "graphviz",
  d2: "d2",
  dbml: "dbml",
  goat: "goat",
  svgbob: "svgbob",
};

type Drawn = { svg: string } | { rule: Rule; problem: string };

const isElement = (node: Node): node is ElementNode => Array.isArray(node) && node[0] !== null;
const childrenOf = ([, , ...rest]: ElementNode): Node[] => rest;
const textOf = (node: Node): string =>
  !Array.isArray(node) ? node : isElement(node) ? childrenOf(node).map(textOf).join("") : "";
const text = (value: unknown) =>
  value === undefined || value === null || value instanceof Object
    ? ""
    : // SAFETY: undefined, null, objects, and arrays returned above, so only a string, number, or boolean is left.
      String(value as string | number | boolean).trim();
const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error));

class Refused extends Error {}

async function request(server: string, type: string, source: string): Promise<string> {
  const send = () =>
    fetch(`${server}/${type}/svg`, {
      method: "POST",
      headers: { "content-type": "text/plain" },
      body: source,
      signal: AbortSignal.timeout(15_000),
    });
  let response: Response;
  try {
    response = await send();
  } catch (error) {
    if (!(error instanceof Error) || error.name !== "TimeoutError") throw error;
    response = await send();
  }
  const body = await response.text();
  // Kroki answers a diagram it can't draw with its tool's error, after a status line.
  if (!response.ok)
    throw new Refused(
      body
        .replace(/^Error \d+:\s*/, "")
        .replace(/\s*\(exit code \d+\)\s*$/, "")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(0, 2)
        .join(" ") || `HTTP ${response.status}`,
    );
  if (!/<svg[\s>]/.test(body)) throw new Error("it answered without an SVG");
  return sized(sanitizeSvg(body));
}

// D2 draws with a `viewBox` alone, which stretches the drawing to the column's width however tall that makes it, so it
// gets the size its `viewBox` gives, as the other tools write it.
function sized(svg: string): string {
  return svg.replace(/<svg\b[^>]*>/, (tag) => {
    if (/\swidth=/.test(tag)) return tag;
    const box = /\sviewBox="[\d.\s-]*?([\d.]+)[\s,]+([\d.]+)"/.exec(tag);
    return box ? tag.replace(/^<svg/, `<svg width="${box[1]}" height="${box[2]}"`) : tag;
  });
}

// Each diagram by server, type, and source, kept across parses and instances, so a site that builds many pages draws
// each once. A failed one isn't kept, so the next parse tries again.
const drawings = new Map<string, Promise<string>>();

async function draw(server: string, type: string, source: string): Promise<Drawn> {
  const key = `${server}\n${type}\n${source}`;
  let pending = drawings.get(key);
  if (!pending) {
    pending = request(server, type, source);
    drawings.set(key, pending);
    pending.catch(() => drawings.delete(key));
  }
  try {
    return { svg: await pending };
  } catch (error) {
    return error instanceof Refused
      ? {
          rule: "comark/diagrams/draw-failed",
          problem: `Kroki couldn't draw it: ${error.message}. Fix the diagram's source.`,
        }
      : {
          rule: "comark/diagrams/server-unreachable",
          problem: `couldn't reach the Kroki server at ${server} (${errorText(error)}). Check \`server\`, or build again.`,
        };
  }
}

/**
 * Draws ` ```plantuml `, ` ```graphviz ` or ` ```dot `, ` ```d2 `, ` ```dbml `, and ` ```goat ` or ` ```svgbob ` fences as
 * inline SVG while parsing, through a Kroki server. The fence's source is sent to that server. A fence that can't be
 * drawn stays code, and a sentence about it is added to `meta.issues`.
 */
export default defineComarkPlugin<DiagramsOptions | undefined, DiagramsMeta>((options = {}) => {
  const server = (options.server ?? "https://kroki.io").replace(/\/+$/, "");
  return {
    name: "comark-diagrams",
    async post(state) {
      if (options.draw === false) return;
      const { tree } = state;
      const found: {
        list: Node[];
        index: number;
        node: ElementNode;
        type: string;
        name: string;
      }[] = [];
      let count = 0;
      const walk = (list: Node[], start: number) => {
        for (let index = start; index < list.length; index++) {
          const node = list[index];
          if (!node || !isElement(node)) continue;
          if (node[0] !== "pre") {
            // SAFETY: an element node is [tag, attributes, ...children], so its children start at index 2.
            walk(node as Node[], 2);
            continue;
          }
          count++;
          const language = text(node[1].language).toLowerCase();
          const type = LANGUAGES[language];
          if (type)
            found.push({ list, index, node, type, name: `The \`\`\`${language} fence ${count}` });
        }
      };
      walk(tree.nodes, 0);
      if (!found.length) return;
      const issues: Issue[] = [];
      const drawn = await Promise.all(
        found.map(({ node, type }) => draw(server, type, textOf(node).trim())),
      );
      for (const [at, { list, index, node, type, name }] of found.entries()) {
        const result = drawn[at];
        if (!result || "problem" in result) {
          issues.push({
            rule: result?.rule ?? "comark/diagrams/draw-failed",
            message: `${name}: ${result?.problem ?? "it wasn't drawn."}`,
          });
          continue;
        }
        const label = text(node[1].filename);
        list[index] = ["diagram", { type, svg: result.svg, ...(label && { label }) }];
      }
      tree.meta.issues = [...(tree.meta.issues ?? []), ...issues.map((issue) => issue.message)];
      tree.meta.issueRules = {
        ...tree.meta.issueRules,
        ...Object.fromEntries(issues.map((issue) => [issue.message, issue.rule])),
      };
    },
  };
});
