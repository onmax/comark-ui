// The landing's studio, `::hero`: the agent's draft of the Markdown typed out a line at a time beside the page the
// plugins render, each block appearing once its lines are typed. Then the plugins' first issue on the draft, the one
// value the fixed Markdown changes, and the fixed block drawn. This plugin works out everything the animation needs
// while the page parses, and docs/app/components/content/Studio.vue plays it. The page is the docs' own nodes, drawn
// as any page's are.
import { renderHtmlFromDocument } from "@comark/html";
import {
  defineComarkPlugin,
  parseMarkdown,
  type ComarkPlugin,
  type ElementNode,
  type Node,
} from "comark";
import { textContent } from "comark/utils";

const isElement = (node: Node): node is ElementNode =>
  Array.isArray(node) && typeof node[0] === "string";
// SAFETY: an element node is [tag, attributes, ...children].
const childrenOf = (node: ElementNode) => node.slice(2) as Node[];
const isPre = (node: Node): node is ElementNode => isElement(node) && node[0] === "pre";

async function playLink(source: string) {
  const stream = new Blob([source]).stream().pipeThrough(new CompressionStream("deflate-raw"));
  const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
  const base64 = btoa(String.fromCharCode(...bytes));
  return `/play#md=${base64.replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "")}`;
}

async function studio(node: ElementNode, plugins: () => ComarkPlugin[]) {
  const children = childrenOf(node);
  const [draftPre, pre] = children.filter(isPre);
  if (!draftPre || !pre)
    throw new Error(
      "The hero needs two fenced code blocks: the agent's draft, then the fixed Markdown.",
    );
  const intro = children.filter((child) => !isPre(child));
  const [draft, source] = [draftPre, pre].map((block) => textContent(block).trimEnd()) as [
    string,
    string,
  ];
  const page = await parseMarkdown(source, { plugins: plugins() });
  if (page.meta.issues.length) throw new Error(`The hero:\n${page.meta.issues.join("\n")}`);
  const [issue] = (await parseMarkdown(draft, { plugins: plugins() })).meta.issues as string[];
  if (!issue) throw new Error("The hero's draft needs a problem for the plugins to report.");
  const lines = source.split("\n");
  const draftLines = draft.split("\n");
  const changed = lines.flatMap((line, i) => (line === draftLines[i] ? [] : [i]));
  if (lines.length !== draftLines.length || changed.length !== 1)
    throw new Error("The hero's draft and fixed Markdown must differ in exactly one line.");
  // The value the fix changes, widened to the whole word, number, or quoted string around it.
  const at = changed[0]!;
  const [wrong, right] = [draftLines[at]!, lines[at]!];
  let start = 0;
  while (wrong[start] === right[start]) start++;
  let end = 0;
  while (
    end < Math.min(wrong.length, right.length) - start &&
    wrong.at(-1 - end) === right.at(-1 - end)
  )
    end++;
  while (start > 0 && /[\w.-]/.test(right[start - 1]!)) start--;
  while (end > 0 && /[\w.-]/.test(right.at(-end)!)) end--;
  const was = wrong.slice(start, wrong.length - end);
  const is = right.slice(start, right.length - end);
  // The annotation the fix is in, so its mark waits for it.
  const fixed = lines.slice(0, at + 1).filter((line) => /^:+annotation\b/.test(line)).length;
  // Each top-level block ends where the Markdown at the top level next has a blank line, or closes its `::`.
  const ends: number[] = [];
  let depth = 0;
  let open = false;
  for (const [i, line] of lines.entries()) {
    if (depth === 0 && line.trim() && !open) open = true;
    const fence = /^(:{2,})([\w-]*)/.exec(line);
    if (fence?.[2]) depth++;
    else if (fence) depth--;
    if (depth === 0 && open && (!lines[i + 1]?.trim() || (fence && !fence[2]))) {
      ends.push(i);
      open = false;
    }
  }
  // A plugin may add a node for the whole document, such as its styles, which no line of the Markdown wrote.
  const nodes = page.nodes.filter(isElement).filter(([tag]) => !/-(runtime|styles)$/.test(tag));
  if (nodes.length !== ends.length)
    throw new Error(`The hero renders ${nodes.length} blocks from ${ends.length} in its Markdown.`);
  // When each line starts typing and how long it takes, as many steps as it has characters, all in about two seconds.
  const perChar = Math.min(16, 2200 / draft.length);
  const timing: { at: number; t: number }[] = [];
  let clock = 0;
  for (const line of draftLines) {
    timing.push({ at: Math.round(clock), t: Math.round(line.length * perChar) });
    clock += line.length * perChar + 40;
  }
  const typed = Math.round(clock);
  const done = (line: number) => timing[line]!.at + timing[line]!.t;

  // The fixed Markdown as Shiki drew it, a block per line, so each line's reveal steps one character at a time.
  const code = childrenOf(pre).find(isElement)!;
  const lineNodes = childrenOf(code).filter(isElement);
  lineNodes.forEach((line, i) => {
    line[1] = {
      class: "line",
      ...(i === at ? { "data-fix": "" } : {}),
      style: `--n:${Math.max(draftLines[i]!.length, 1)};--t:${timing[i]!.t}ms;--at:${timing[i]!.at}ms`,
    };
  });
  code.splice(2, code.length, ...lineNodes);
  const token = childrenOf(lineNodes[at]!).find(
    (span): span is ElementNode => isElement(span) && textContent(span).includes(is),
  );
  if (!token) throw new Error(`The hero's fix, "${is}", isn't one token in its highlighted line.`);
  const text = textContent(token);
  const cut = text.indexOf(is);
  token.splice(
    2,
    token.length,
    text.slice(0, cut),
    ["span", { class: "studio-fix" }, ["del", {}, was], ["ins", { style: `--n:${is.length}` }, is]],
    text.slice(cut + is.length),
  );

  // The draft's box for the fixed annotation, dashed where the draft put it, so the fix moves it into place.
  const boxOf = (line: string) =>
    Object.fromEntries(
      [...line.matchAll(/\b([xywh])=([\d.]+)/g)].map(([, key, value]) => [key, Number(value)]),
    );
  const [box, fixedBox] = [boxOf(wrong), boxOf(right)];
  const ghost = ["x", "y", "w", "h"].every((key) => key in box && key in fixedBox)
    ? `<span class="studio-ghost" aria-hidden="true" style="--x:${box.x}%;--y:${box.y}%;--w:${box.w}%;--h:${box.h}%;--to-x:${fixedBox.x}%;--to-y:${fixedBox.y}%;--to-w:${fixedBox.w}%;--to-h:${fixedBox.h}%"></span>`
    : "";
  // Annotation n's mark and note show once its lines are typed: the line that opens the next block or closes this one.
  const annotationEnds = lines.flatMap((line, i) => {
    if (!/^:+annotation\b/.test(line)) return [];
    let close = i + 1;
    while (close < lines.length && !/^:+$/.test(lines[close]!)) close++;
    return [done(Math.min(close, lines.length - 1))];
  });
  // A block with only an HTML renderer reaches the page as that HTML, so its marks and notes are timed in it.
  const timed = (html: string) => {
    html = html.replace(/(<(?:span|li)\b[^>]*?) data-n="(\d+)"/g, (_, tag: string, n: string) => {
      const shown = annotationEnds[Number(n) - 1] ?? 0;
      return `${tag} data-n="${n}"${Number(n) === fixed ? " data-fixed" : ""} data-at="${Math.round(shown)}"`;
    });
    return ghost && html.includes('<span class="ca-mark')
      ? html.replace('<span class="ca-mark', `${ghost}<span class="ca-mark`)
      : html;
  };
  const visit = (node: Node) => {
    if (!isElement(node)) return;
    if (node[0] === "comark-html" && typeof node[1].html === "string")
      node[1].html = timed(node[1].html);
    childrenOf(node).forEach(visit);
  };
  nodes.forEach(visit);
  const blocks = nodes.map((block, i): ElementNode => [
    "div",
    { class: "studio-block", style: `--at:${done(ends[i]!)}ms` },
    block,
  ]);
  const separator = issue.indexOf(": ") + 1;
  return [
    "studio",
    {
      // The renderer breaks the line between `del` and `ins`, which the code's `white-space: pre` would show.
      code: (await renderHtmlFromDocument({ nodes: [pre] })).replace("</del>\n<ins", "</del><ins"),
      lines: lines.length,
      fix: at,
      typed,
      where: issue.slice(0, separator),
      issue: issue.slice(separator),
      play: await playLink(source),
    },
    ["div", { class: "studio-intro" }, ...intro],
    ["div", { class: "studio-blocks" }, ...blocks],
  ] satisfies ElementNode;
}

/** Turns the landing's `::hero` into a `studio` node with what Studio.vue animates. */
export const studioPlugin = defineComarkPlugin((plugins: () => ComarkPlugin[] = () => []) => ({
  name: "docs-studio",
  post: async (state) => {
    const nodes: Node[] = state.tree.nodes;
    for (const [i, node] of nodes.entries())
      if (isElement(node) && node[0] === "hero") nodes[i] = await studio(node, plugins);
  },
}));
