import { Marked, type MarkedExtension, type MarkedOptions, type Token, type Tokens } from "marked";

export interface ContentOptions {
  /** Whether the Comark side keeps component and attribute syntax; see `comarkSetup`. */
  syntax?: "comark" | "plain";
  /** The project's marked options that change what's text: `gfm`, `breaks`, `pedantic`. */
  options?: MarkedOptions;
  /**
   * The project's syntax extensions, such as marked-katex-extension or marked-footnote. Their tokens aren't text, so
   * what they parse (`$x_{i}$`, `[^1]`) is left as written instead of being escaped.
   */
  extensions?: MarkedExtension[];
  /**
   * The project's own marked, as a function from Markdown to HTML. Every edit is kept only if it renders the file byte
   * for byte as before; without it, the marked bundled here, with `options` and `extensions`, is the judge.
   */
  render?: (markdown: string) => string;
  /** Whether the project renders GitHub alerts (`> [!NOTE]`, marked-alert), so their markers stay for Comark's alert plugin. */
  alerts?: boolean;
  /** Whether the project turns `:smile:` into emoji (marked-emoji), so shortcodes stay for Comark's emoji plugin. */
  emoji?: boolean;
}

export interface ContentChange {
  /** 1-based line in the original source. */
  line: number;
  kind: "escape" | "strikethrough" | "reference" | "space";
  text: string;
}

export interface ContentResult {
  markdown: string;
  changes: ContentChange[];
  /** Lines of blocks left as written because no edit kept marked's output; Comark may read them differently. */
  skipped: number[];
}

interface Edit {
  offset: number;
  /** Characters replaced at `offset`; most edits only insert. */
  remove?: number;
  insert: string;
  change: ContentChange;
}

const ALERT = /^\[!(?:note|tip|important|warning|caution)\]/i;
// `---` YAML at the very top: projects that use marked strip it with gray-matter or front-matter first, and
// every other tool reads it as data, so it stays byte for byte either way.
const FRONTMATTER = /^(?:﻿)?---[a-z]*[ \t]*\n(?:[\s\S]*?\n)?---[ \t]*(?:\n|$)/;

interface Context {
  /** Offset of an alert marker to leave alone. */
  alertAt: number;
  /** Inside a link's text, where `]` must stay balanced with an escaped `[`. */
  inLabel: boolean;
  /** Inside `~a~` being widened to `~~a~~`, where a literal `~` would close it early. */
  inStrike: boolean;
  /** Leave `:shortcode:` emoji as written. */
  emoji: boolean;
  /** Comark's syntax is off: only a `~` that would close a widened strikethrough needs escaping. */
  plain?: boolean;
}

/**
 * Characters Comark reads as syntax where marked reads text: `{` opens attributes, `[` a span, and `:` before a
 * letter a component (`:smile:`, `::note`). A backslash before ASCII punctuation is an escape in marked, so it renders
 * the same; the render check below proves it for the project's own marked.
 */
function escapes(source: string, start: number, end: number, context: Context): Edit[] {
  const edits: Edit[] = [];
  let open = 0;
  for (let offset = start; offset < end; offset++) {
    if (offset === context.alertAt) continue;
    const char = source[offset]!;
    if (context.plain && char !== "~") continue;
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
    edits.push({ offset, insert: "\\", change: { line: 0, kind: "escape", text: char } });
  }
  return edits;
}

type Span = [start: number, end: number];

/**
 * Where a token's text sits in the source, as one span or, when marked stripped a quote's `>` or a list item's
 * indent from its lines, one span per line. Undefined when it can't be found, and the token is left alone.
 */
function locate(source: string, text: string, from: number, limit: number): Span[] | undefined {
  if (!text) return [];
  const exact = source.indexOf(text, from);
  if (exact !== -1 && exact + text.length <= limit) return [[exact, exact + text.length]];
  const lines = text.split("\n");
  const first = source.indexOf(lines[0]!, from);
  if (first === -1 || first + lines[0]!.length > limit) return undefined;
  const spans: Span[] = [[first, first + lines[0]!.length]];
  let cursor = first + lines[0]!.length;
  for (const line of lines.slice(1)) {
    if (source[cursor] !== "\n") return undefined;
    let start = cursor + 1;
    // The prefix marked stripped: indentation and quote markers.
    let prefix = start;
    while (prefix < limit && /[ \t>]/.test(source[prefix]!)) prefix++;
    while (prefix > start && !source.startsWith(line, prefix)) prefix--;
    if (!source.startsWith(line, prefix)) return undefined;
    start = prefix;
    if (start + line.length > limit) return undefined;
    spans.push([start, start + line.length]);
    cursor = start + line.length;
  }
  return spans;
}

/** The 1-based line of an offset. */
function lineAt(starts: number[], offset: number): number {
  let low = 0;
  let high = starts.length - 1;
  while (low < high) {
    const middle = (low + high + 1) >> 1;
    if (starts[middle]! <= offset) low = middle;
    else high = middle - 1;
  }
  return low + 1;
}

/** The HTML the bundled marked renders, for when the project's own copy isn't given. */
function bundled(options: ContentOptions): (markdown: string) => string {
  const marked = new Marked(...(options.extensions ?? []));
  return (markdown) => marked.parse(markdown, { ...options.options, async: false });
}

const hasChildren = (token: Token): token is Token & { tokens: Token[] } =>
  "tokens" in token && Array.isArray(token.tokens);

/**
 * Rewrites Markdown written for marked so Comark reads it the same way, and lists every change by line. Only text
 * marked reads as text is touched, and an edit is kept only if marked still renders the file byte for byte as
 * before; code, HTML, and frontmatter stay as written.
 */
export function migrateContent(original: string, options: ContentOptions = {}): ContentResult {
  const syntax = options.syntax ?? "comark";
  // marked reads `\r\n` as `\n`; the edits are found on the normalized text and mapped back.
  const crlf = original.includes("\r");
  const source = crlf ? original.replace(/\r\n?/g, "\n") : original;
  const front = FRONTMATTER.exec(source)?.[0].length ?? 0;
  const body = source.slice(front);
  const marked = new Marked(...(options.extensions ?? []));
  let tokens: Token[];
  try {
    // `lexer()` takes the options as given, without the defaults `parse()` merges in.
    tokens = marked.lexer(body, { ...marked.defaults, ...options.options });
  } catch {
    return { markdown: original, changes: [], skipped: [] };
  }

  // Edits per top-level block, so one block marked reads differently after its edits can be dropped alone.
  const groups: Edit[][] = [];
  const skipped = new Set<number>();
  let group: Edit[] = [];

  const inline = (list: Token[], from: number, limit: number, context: Partial<Context>) => {
    let cursor = from;
    for (const token of list) {
      const spans = locate(source, token.raw, cursor, limit);
      if (!spans?.length) continue;
      const start = spans[0]![0];
      const end = spans.at(-1)![1];
      cursor = end;
      visit(token, spans, start, end, context);
    }
  };

  const visit = (
    token: Token,
    spans: Span[],
    start: number,
    end: number,
    context: Partial<Context>,
  ) => {
    switch (token.type) {
      case "text": {
        if (hasChildren(token)) return inline(token.tokens, start, end, context);
        // Plain mode keeps Comark's syntax off, so only a literal `~` inside a widened strikethrough needs escaping.
        if (syntax !== "comark" && !context.inStrike) return;
        for (const [from, to] of spans)
          group.push(
            ...escapes(source, from, to, {
              alertAt: context.alertAt ?? -1,
              inLabel: Boolean(context.inLabel),
              inStrike: Boolean(context.inStrike),
              emoji: Boolean(options.emoji),
              plain: syntax !== "comark",
            }),
          );
        return;
      }
      case "link": {
        // An autolink's text is its URL: `<https://a/{x}>` and bare URLs stay as written.
        if (source[start] !== "[") return;
        const link = token as Tokens.Link;
        const close = source.lastIndexOf("]", end);
        const shortcut = close === end - 1 && !/\]\s*\[[^\]]*\]$/.test(source.slice(start, end));
        const collapsed = /\]\s*\[\]$/.test(source.slice(start, end));
        if (shortcut || collapsed) {
          if (syntax !== "comark") return;
          // The label is matched as written, so escapes in it would break the reference: they go in the text of a
          // full reference, `[escaped][label]`. Comark reads a bare `[label]` as a span, so even a clean one gets `[]`.
          const labelEnd = shortcut
            ? end - 1
            : source.lastIndexOf("]", source.lastIndexOf("[", end - 1));
          const label = source.slice(start + 1, labelEnd);
          const before = group.length;
          inline(link.tokens ?? [], start + 1, labelEnd, { ...context, inLabel: true });
          const line = 0;
          if (group.length > before)
            group.push(
              shortcut
                ? {
                    offset: end,
                    insert: `[${label}]`,
                    change: { line, kind: "reference", text: `[${label}]` },
                  }
                : {
                    offset: end - 1,
                    insert: label,
                    change: { line, kind: "reference", text: label },
                  },
            );
          else if (shortcut)
            group.push({
              offset: end,
              insert: "[]",
              change: { line, kind: "reference", text: "[]" },
            });
          return;
        }
        return inline(link.tokens ?? [], start + 1, close === -1 ? end : close, {
          ...context,
          inLabel: true,
        });
      }
      case "del": {
        const del = token as Tokens.Del;
        if (source[start + 1] === "~") return inline(del.tokens, start, end, context);
        // marked reads `~a~` as strikethrough; markdown-exit needs `~~a~~`. One nested in another is left to a person.
        if (
          del.tokens.some(
            (child) => child.type === "del" || JSON.stringify(child).includes('"type":"del"'),
          )
        ) {
          skipped.add(start);
          return;
        }
        group.push({
          offset: start,
          insert: "~",
          change: { line: 0, kind: "strikethrough", text: "~" },
        });
        group.push({
          offset: end - 1,
          insert: "~",
          change: { line: 0, kind: "strikethrough", text: "~" },
        });
        return inline(del.tokens, start + 1, end - 1, { ...context, inStrike: true });
      }
      case "heading": {
        // marked takes any whitespace after the `#`s (a no-break space, say); CommonMark and Comark need a space or tab.
        const marks = /^( {0,3}#{1,6})([^\S \t\n])/.exec(source.slice(start, end));
        if (marks)
          group.push({
            offset: start + marks[1]!.length,
            remove: 1,
            insert: " ",
            change: { line: 0, kind: "space", text: " " },
          });
        return inline((token as Tokens.Heading).tokens, start, end, context);
      }
      case "paragraph":
      case "strong":
      case "em":
        return inline((token as Tokens.Paragraph).tokens, start, end, context);
      case "blockquote": {
        const quote = token as Tokens.Blockquote;
        // An alert marker opens the first paragraph of a blockquote; marked may split it over several tokens.
        const marker = /^[ \t]*>[ \t]?/.exec(source.slice(start, end));
        const alertAt =
          options.alerts && marker && ALERT.test(source.slice(start + marker[0].length, end))
            ? start + marker[0].length
            : -1;
        return block(quote.tokens, start, end, { ...context, alertAt });
      }
      case "list":
        return block((token as Tokens.List).items, start, end, context);
      case "list_item":
        return block((token as Tokens.ListItem).tokens, start, end, context);
      case "table": {
        const table = token as Tokens.Table;
        let cursor = start;
        for (const cell of [...table.header, ...table.rows.flat()]) {
          const spans = locate(source, cell.text, cursor, end);
          if (!spans?.length) continue;
          const [from] = spans[0]!;
          const to = spans.at(-1)![1];
          cursor = to;
          inline(cell.tokens, from, to, context);
        }
        return;
      }
    }
    // Code, HTML, definitions, escapes, and extension tokens (math, footnotes) are left as written.
  };

  const block = (list: Token[], from: number, limit: number, context: Partial<Context>) => {
    let cursor = from;
    for (const token of list) {
      const spans = locate(source, token.raw, cursor, limit);
      if (!spans?.length) continue;
      const start = spans[0]![0];
      const end = spans.at(-1)![1];
      cursor = end;
      visit(token, spans, start, end, context);
    }
  };

  let cursor = front;
  for (const token of tokens) {
    const spans = locate(source, token.raw, cursor, source.length);
    if (!spans?.length) continue;
    cursor = spans.at(-1)![1];
    group = [];
    visit(token, spans, spans[0]![0], cursor, {});
    if (group.length) groups.push(group);
  }

  const starts = [0];
  for (let index = source.indexOf("\n"); index !== -1; index = source.indexOf("\n", index + 1))
    starts.push(index + 1);
  const apply = (edits: Edit[]) => {
    // In source order, later edits at the same offset first; one pass, since a changelog can need thousands.
    const ordered = edits
      .map((edit, index) => ({ edit, index }))
      .sort((a, b) => a.edit.offset - b.edit.offset || b.index - a.index);
    const parts: string[] = [];
    let at = 0;
    for (const { edit } of ordered) {
      parts.push(source.slice(at, edit.offset), edit.insert);
      at = edit.offset + (edit.remove ?? 0);
    }
    parts.push(source.slice(at));
    return { text: parts.join(""), ordered: ordered.map(({ edit }) => edit) };
  };

  // marked must render the result byte for byte as before. A block whose edits change that is left as written.
  const render = options.render ?? bundled(options);
  const reference = render(source);
  let kept = groups;
  if (groups.length && render(apply(groups.flat()).text) !== reference) {
    kept = groups.filter((edits) => {
      if (render(apply(edits).text) === reference) return true;
      skipped.add(edits[0]!.offset);
      return false;
    });
    if (kept.length && render(apply(kept.flat()).text) !== reference) {
      for (const edits of kept) skipped.add(edits[0]!.offset);
      kept = [];
    }
  }
  const result = apply(kept.flat());
  // Offsets into the normalized text map back to the original; an edit before a `\r\n` goes before its `\r`.
  let markdown = result.text;
  if (crlf) {
    const map: number[] = [];
    for (let index = 0; index < original.length; index++) {
      map.push(index);
      if (original[index] === "\r" && original[index + 1] === "\n") index++;
    }
    map.push(original.length);
    const parts: string[] = [];
    let at = 0;
    for (const edit of result.ordered) {
      parts.push(original.slice(at, map[edit.offset]), edit.insert);
      at = map[edit.offset + (edit.remove ?? 0)]!;
    }
    parts.push(original.slice(at));
    markdown = parts.join("");
  }
  return {
    markdown,
    skipped: [...new Set([...skipped].map((offset) => lineAt(starts, offset)))].sort(
      (a, b) => a - b,
    ),
    changes: result.ordered.map((edit) => ({ ...edit.change, line: lineAt(starts, edit.offset) })),
  };
}
