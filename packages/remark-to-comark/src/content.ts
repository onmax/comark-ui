import type { Nodes, Text } from "mdast";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeStringify from "rehype-stringify";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified, type Data, type PluggableList, type Processor } from "unified";
import { visitParents } from "unist-util-visit-parents";

export interface ContentOptions {
  /** Whether the Comark side keeps component and attribute syntax; see `comarkSetup`. */
  syntax?: "comark" | "plain";
  /**
   * The project's syntax plugins, such as remark-directive or remark-math. Their nodes aren't text, so what they
   * parse (`:::note`, `$x$`) is left for Comark's own syntax instead of being escaped.
   */
  remarkPlugins?: PluggableList;
  /** Whether the project renders GitHub alerts (`> [!NOTE]`), so their markers stay for Comark's alert plugin. */
  alerts?: boolean;
  /** Whether the project turns `:smile:` into emoji (remark-gemoji), so shortcodes stay for Comark's emoji plugin. */
  emoji?: boolean;
  /** Internal: parse one block without remark-gfm's autolink transform, to edit a block that transform touched. */
  block?: boolean;
  /** Whether the project reads GFM (remark-gfm). Without it, `~a~` stays text and tables stay paragraphs. */
  gfm?: boolean;
}

export interface ContentChange {
  /** 1-based line in the original source. */
  line: number;
  kind: "escape" | "strikethrough" | "reference";
  text: string;
}

export interface ContentResult {
  markdown: string;
  changes: ContentChange[];
  /** Lines of blocks left as written because no edit could keep remark's output; Comark may read them differently. */
  skipped: number[];
}

interface Edit {
  offset: number;
  remove: number;
  insert: string;
  change: ContentChange;
}

const parser = unified().use(remarkParse).use(remarkGfm).use(remarkFrontmatter, ["yaml", "toml"]);

type Extension = Exclude<NonNullable<Data["fromMarkdownExtensions"]>[number], unknown[]>;
/**
 * remark-gfm without its autolink transform, which links URLs after an unclosed `[` and leaves them without positions.
 * Literal autolinks micromark finds itself still become links.
 */
function withoutAutolinkTransform(this: Processor) {
  const data = this.data();
  const strip = (extension: Extension): Extension => ({ ...extension, transforms: [] });
  data.fromMarkdownExtensions = (data.fromMarkdownExtensions ?? []).map((extension) =>
    Array.isArray(extension) ? extension.map(strip) : strip(extension),
  );
}

/** The HTML remark renders, synchronously, to check a block's edits against. */
const render = (markdown: string, plugins: PluggableList = [], gfm = true) =>
  String(
    unified()
      .use(remarkParse)
      .use(gfm ? [remarkGfm] : [])
      .use(plugins)
      .use(remarkRehype, { allowDangerousHtml: true })
      .use(rehypeRaw)
      .use(rehypeStringify)
      .processSync(markdown),
  );

const ALERT = /^\[!(?:note|tip|important|warning|caution)\]/i;

interface Context {
  /** Offset of an alert marker to leave alone. */
  alertAt: number;
  /** Inside a link's text, where `]` must stay balanced with an escaped `[`. */
  inLabel: boolean;
  /** Inside `~a~` being widened to `~~a~~`, where a literal `~` would close it early. */
  inStrike: boolean;
  /** Leave `:shortcode:` emoji as written. */
  emoji: boolean;
}

/**
 * Characters Comark reads as syntax where remark reads text: `{` opens attributes, `[` a span, and `:` before a
 * letter a component (`:smile:`, `::note`). Escaping them is a no-op for remark, since a backslash before ASCII
 * punctuation is plain CommonMark.
 */
function escapes(source: string, start: number, end: number, context: Context): Edit[] {
  const edits: Edit[] = [];
  let open = 0;
  for (let offset = start; offset < end; offset++) {
    if (offset === context.alertAt) continue;
    const char = source[offset]!;
    // An odd run of backslashes already escapes this character; an even run is literal backslashes.
    let slashes = 0;
    while (source[offset - 1 - slashes] === "\\") slashes++;
    if (slashes % 2) continue;
    const before = source[offset - 1] ?? "\n";
    let escape = false;
    if (char === "{") escape = before !== "{" && source[offset + 1] !== "{";
    else if (char === "[") {
      // Comark reads `[` as a span even with no `]`: the span then runs to the end of the paragraph.
      escape = true;
      open++;
    } else if (char === "]") {
      escape = open > 0 || context.inLabel;
      if (open > 0) open--;
    } else if (char === ":") {
      escape = /[A-Za-z$]/.test(source[offset + 1] ?? "") && !/[A-Za-z0-9]/.test(before);
      // `::: info` at the start of a line: Comark reads a block component even with a space before the name.
      let run = offset;
      while (source[run - 1] === ":") run--;
      if (
        (run === start || source[run - 1] === "\n") &&
        /^:{2,}[ \t]+[A-Za-z$]/.test(source.slice(run, run + 80))
      )
        escape = true;
      // A shortcode's opening colon, or its closing one, when the project renders them as emoji.
      if (
        escape &&
        context.emoji &&
        (/^:[\w+-]+:/.test(source.slice(offset, end)) ||
          /:[\w+-]+$/.test(source.slice(start, offset)))
      )
        escape = false;
    } else if (char === "~") escape = context.inStrike;
    if (!escape) continue;
    edits.push({
      offset,
      remove: 0,
      insert: "\\",
      change: { line: lineAt(source, offset), kind: "escape", text: char },
    });
  }
  return edits;
}

const BLOCKS = new Set(["paragraph", "heading", "tableCell"]);

// The 1-based line of an offset, by binary search over line starts computed once per document.
const lineAt = (source: string, offset: number) => {
  let starts = cachedStarts.source === source ? cachedStarts.starts : undefined;
  if (!starts) {
    starts = [0];
    for (let index = source.indexOf("\n"); index !== -1; index = source.indexOf("\n", index + 1))
      starts.push(index + 1);
    cachedStarts.source = source;
    cachedStarts.starts = starts;
  }
  let low = 0;
  let high = starts.length - 1;
  while (low < high) {
    const middle = (low + high + 1) >> 1;
    if (starts[middle]! <= offset) low = middle;
    else high = middle - 1;
  }
  return low + 1;
};
const cachedStarts: { source?: string; starts?: number[] } = {};

/**
 * Rewrites Markdown written for remark so Comark reads it the same way, and lists every change by line. Only text
 * remark already read as text is touched; code, HTML, and everything else stay byte for byte.
 */
export function migrateContent(source: string, options: ContentOptions = {}): ContentResult {
  const syntax = options.syntax ?? "comark";
  const tree = (
    options.gfm === false
      ? unified()
          .use(remarkParse)
          .use(remarkFrontmatter, ["yaml", "toml"])
          .use(options.remarkPlugins ?? [])
      : options.block
        ? unified()
            .use(remarkParse)
            .use(remarkGfm)
            .use(withoutAutolinkTransform)
            .use(options.remarkPlugins ?? [])
        : options.remarkPlugins?.length
          ? unified()
              .use(remarkParse)
              .use(remarkGfm)
              .use(remarkFrontmatter, ["yaml", "toml"])
              .use(options.remarkPlugins)
          : parser
  ).parse(source);
  // remark-gfm links a URL after an unclosed `[` in a transform that leaves nodes without positions, and escaping that
  // `[` would move remark onto its other autolink path, with different link ends. Such blocks stay as written.
  const unsafe = new Set<Nodes>();
  visitParents(tree, (node: Nodes, ancestors: Nodes[]) => {
    if (node.position) return;
    const owner =
      ancestors.findLast((ancestor) => BLOCKS.has(ancestor.type)) ??
      ancestors.findLast((ancestor) => ancestor.position);
    if (owner) unsafe.add(owner);
  });
  const edits: Edit[] = [];
  // The changes inside a block edited as a whole, listed in place of its one replacing edit.
  const blockChanges = new Map<number, ContentChange[]>();
  // Frontmatter with a language (`---js`) isn't Markdown, though remark-frontmatter doesn't know it.
  const frontmatterEnd =
    /^---[a-z]+[ \t]*\r?\n[\s\S]*?\r?\n---[ \t]*(?:\r?\n|$)/.exec(source)?.[0].length ?? 0;
  // A URL remark left as text (after an unclosed `[`) would be linked once that `[` is escaped, and Comark's linkify
  // links it either way. An escaped slash keeps it plain text for both.
  const unlinkedUrls = (node: Text, ancestors: Nodes[]): Edit[] => {
    const start = node.position?.start.offset;
    const end = node.position?.end.offset;
    // In a block remark-gfm's transform touched, the transform links the decoded text, escape or not.
    if (
      options.block ||
      start == null ||
      end == null ||
      ancestors.some((ancestor) => ancestor.type === "link" || ancestor.type === "linkReference")
    )
      return [];
    return [
      ...source.slice(start, end).matchAll(/\b(?:https?:\/(?=\/)|www(?=\.[a-z0-9-]+\.[a-z]))/gi),
    ].map((match) => {
      const offset = start + match.index + match[0].length;
      return {
        offset,
        remove: 0,
        insert: "\\",
        change: { line: lineAt(source, offset), kind: "escape", text: source[offset]! },
      };
    });
  };
  const textEdits = (node: Text, ancestors: Nodes[]): Edit[] => {
    const start = node.position?.start.offset;
    const end = node.position?.end.offset;
    if (start == null || end == null) return [];
    // An autolink's text is its URL: `<https://a/{x}>` and bare URLs stay as written.
    const link = ancestors.findLast(
      (ancestor) => ancestor.type === "link" || ancestor.type === "linkReference",
    );
    if (link?.type === "link" && source[link.position!.start.offset!] !== "[") return [];
    const strike = ancestors.findLast((ancestor) => ancestor.type === "delete");
    // An alert marker opens the first paragraph of a blockquote.
    const paragraph = ancestors.at(-1);
    const quote = ancestors.at(-2);
    const isAlert =
      options.alerts &&
      quote?.type === "blockquote" &&
      quote.children[0] === paragraph &&
      paragraph?.type === "paragraph" &&
      paragraph.children[0] === node &&
      ALERT.test(node.value);
    return unlinkedUrls(node, ancestors).concat(
      escapes(source, start, end, {
        alertAt: isAlert ? start : -1,
        inLabel: Boolean(link) || ancestors.some((ancestor) => ancestor.type === "imageReference"),
        inStrike: Boolean(strike && source[strike.position!.start.offset! + 1] !== "~"),
        emoji: Boolean(options.emoji),
      }),
    );
  };

  // A block that transform touched is edited on its own, parsed without it, and the edits are kept only if remark
  // renders the block exactly as before: escaping a `[` there can move where remark's link ends.
  const skipped: number[] = [];
  for (const block of unsafe) {
    if (options.block) continue;
    if (block.type !== "paragraph" && block.type !== "heading") {
      skipped.push(block.position!.start.line);
      continue;
    }
    const start = block.position!.start.offset!;
    const end = block.position!.end.offset!;
    const text = source.slice(start, end);
    const edited = migrateContent(text, { ...options, block: true });
    // Comark's linkify doesn't link a `www.` or email literal right after an escaped `[`, so those stay as written.
    if (!edited.changes.length) continue;
    if (
      /\\\[(?:www\.|[^\s@\]]+@)/.test(edited.markdown) ||
      render(edited.markdown, options.remarkPlugins, options.gfm !== false) !==
        render(text, options.remarkPlugins, options.gfm !== false)
    ) {
      skipped.push(block.position!.start.line);
      continue;
    }
    const lineShift = block.position!.start.line - 1;
    edits.push({
      offset: start,
      remove: end - start,
      insert: edited.markdown,
      change: { line: block.position!.start.line, kind: "escape", text: "" },
    });
    blockChanges.set(
      start,
      edited.changes.map((change) => ({ ...change, line: change.line + lineShift })),
    );
  }
  visitParents(tree, (node: Nodes, ancestors: Nodes[]) => {
    if (unsafe.has(node) || ancestors.some((ancestor) => unsafe.has(ancestor))) return "skip";
    if ((node.position?.start.offset ?? 0) < frontmatterEnd) return;
    if (node.type === "delete") {
      const start = node.position?.start.offset;
      const end = node.position?.end.offset;
      // remark-gfm reads `~a~` as strikethrough; markdown-exit needs `~~a~~`.
      if (start == null || end == null || source[start + 1] === "~") return;
      const line = node.position!.start.line;
      // Widening an outer `~a~` around an inner `~~b~~` makes the tildes pair up differently; that's left to a person.
      let nested = false;
      visitParents(node, "delete", (inner: Nodes) => {
        if (inner !== node) nested = true;
      });
      if (nested) {
        skipped.push(line);
        return "skip";
      }
      edits.push({
        offset: start,
        remove: 0,
        insert: "~",
        change: { line, kind: "strikethrough", text: "~" },
      });
      edits.push({
        offset: end - 1,
        remove: 0,
        insert: "~",
        change: { line, kind: "strikethrough", text: "~" },
      });
      // Literal tildes inside would now close it; plain mode has no other escapes to make.
      if (syntax === "plain") {
        visitParents(node, "text", (text: Text) => {
          for (
            let offset = text.position!.start.offset!;
            offset < text.position!.end.offset!;
            offset++
          ) {
            if (source[offset] === "~" && source[offset - 1] !== "\\")
              edits.push({
                offset,
                remove: 0,
                insert: "\\",
                change: { line, kind: "escape", text: "~" },
              });
          }
        });
      }
      return;
    }
    if (syntax !== "comark") {
      if (node.type === "text") edits.push(...unlinkedUrls(node, ancestors));
      return;
    }
    if (
      (node.type === "linkReference" || node.type === "imageReference") &&
      node.referenceType !== "full"
    ) {
      const start = node.position?.start.offset;
      const end = node.position?.end.offset;
      if (start == null || end == null) return "skip";
      // A label is matched as written, so a strikethrough in it can't be widened without breaking the reference.
      let struck = false;
      visitParents(node, "delete", () => {
        struck = true;
      });
      if (struck) {
        skipped.push(node.position!.start.line);
        return "skip";
      }
      const labelStart = start + (node.type === "imageReference" ? 2 : 1);
      const labelEnd = node.referenceType === "collapsed" ? end - 3 : end - 1;
      const line = node.position!.start.line;
      // The label is matched as written, so escapes in it would break the reference: they go in the text of a full
      // reference, `[escaped][label]`. Comark reads a bare `[label]` as a span, so even a clean one gets `[]`.
      const inner: Edit[] = [];
      const children = node.type === "linkReference" ? node.children : [];
      for (const child of children) {
        visitParents(child, "text", (text: Text, path: Nodes[]) => {
          inner.push(...textEdits(text, [...ancestors, node, ...path]));
        });
      }
      const label = source.slice(labelStart, labelEnd);
      if (inner.length) {
        edits.push(...inner);
        if (node.referenceType === "collapsed")
          edits.push({
            offset: end - 1,
            remove: 0,
            insert: label,
            change: { line, kind: "reference", text: label },
          });
        else
          edits.push({
            offset: end,
            remove: 0,
            insert: `[${label}]`,
            change: { line, kind: "reference", text: `[${label}]` },
          });
      } else if (node.referenceType === "shortcut") {
        edits.push({
          offset: end,
          remove: 0,
          insert: "[]",
          change: { line, kind: "reference", text: "[]" },
        });
      }
      return "skip";
    }
    if (node.type === "definition" || node.type === "footnoteReference") return "skip";
    if (node.type === "text") edits.push(...textEdits(node, ancestors));
  });
  // In source order, later edits at the same offset first, as applying them back to front would. One pass: slicing
  // the whole document per edit is quadratic, and a changelog can need tens of thousands of escapes.
  const ordered = edits
    .map((edit, index) => ({ edit, index }))
    .sort((a, b) => a.edit.offset - b.edit.offset || b.index - a.index);
  const parts: string[] = [];
  let cursor = 0;
  for (const { edit } of ordered) {
    parts.push(source.slice(cursor, edit.offset), edit.insert);
    cursor = Math.max(cursor, edit.offset + edit.remove);
  }
  parts.push(source.slice(cursor));
  return {
    markdown: parts.join(""),
    skipped: skipped.sort((a, b) => a - b),
    changes: ordered.flatMap(({ edit }) =>
      blockChanges.get(edit.offset) && edit.remove ? blockChanges.get(edit.offset)! : [edit.change],
    ),
  };
}
