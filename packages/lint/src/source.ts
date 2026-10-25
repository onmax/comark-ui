/** A Markdown source split into lines, with fenced code and frontmatter blanked out, so scans and searches only see what Comark parses. */
export type Source = {
  lines: string[];
  /** Each line with code, frontmatter, and inline code spans replaced by spaces. Columns still match `lines`. */
  prose: string[];
  /** The 0-based index of the first line after the frontmatter. */
  body: number;
  /** The frontmatter, when there is one: the 0-based line its YAML starts on and the closing `---` line. */
  frontmatter?: { start: number; end: number };
};

export function read(markdown: string): Source {
  const lines = markdown.split(/\r\n?|\n/);
  const prose = [...lines];
  let body = 0;
  let frontmatter: Source["frontmatter"];
  // Comark's own rule: `---` at the start, closed by the next line that starts with `---`. The YAML
  // starts at the fifth character, even on the first line, and an empty one leaves the document alone.
  if (lines[0]?.startsWith("---")) {
    const end = lines.findIndex((line, index) => index > 0 && line.startsWith("---"));
    if (end > 0 && lines.slice(0, end).join("\n").slice(4)) {
      frontmatter = { start: lines[0].length > 3 ? 0 : 1, end };
      body = end + 1;
      for (let index = 0; index <= end; index++) prose[index] = "";
    }
  }
  let fence: { char: string; size: number } | undefined;
  for (let index = body; index < lines.length; index++) {
    const line = lines[index]!;
    const marker = /^ {0,3}(`{3,}|~{3,})/.exec(line)?.[1];
    if (fence) {
      if (
        marker?.[0] === fence.char &&
        marker.length >= fence.size &&
        !line.trim().slice(marker.length)
      )
        fence = undefined;
      prose[index] = "";
    } else if (marker) {
      fence = { char: marker[0]!, size: marker.length };
      prose[index] = "";
    } else prose[index] = line.replace(/(`+)[^`]*?\1/g, (span) => " ".repeat(span.length));
  }
  return { lines, prose, body, frontmatter };
}

/**
 * Where `needle` appears in prose, 1-based, from the `nth` match on. A match must not run on into a
 * longer name. With `attribute`, it must also start a value: after `"`, `'`, `=`, `(`, or `<`.
 */
export function find(
  source: Source,
  needle: string,
  {
    nth = 0,
    from = 0,
    to = source.prose.length,
    attribute = false,
  }: { nth?: number; from?: number; to?: number; attribute?: boolean } = {},
): { line: number; column: number } | undefined {
  let seen = 0;
  for (let index = from; index < Math.min(to, source.prose.length); index++) {
    const line = source.prose[index]!;
    for (let at = line.indexOf(needle); at !== -1; at = line.indexOf(needle, at + 1)) {
      if (/[\w-]/.test(line[at + needle.length] ?? "") && /[\w-]$/.test(needle)) continue;
      if (attribute && !/["'=(<]/.test(line[at - 1] ?? "")) continue;
      if (seen++ === nth) return { line: index + 1, column: at + 1 };
    }
  }
  return undefined;
}

/** Find the nth occurrence of any of several source forms, in document order. */
export function findAny(
  source: Source,
  needles: string[],
  {
    nth = 0,
    from = 0,
    to = source.prose.length,
    attribute = false,
  }: { nth?: number; from?: number; to?: number; attribute?: boolean } = {},
): { line: number; column: number } | undefined {
  const matches: { line: number; column: number }[] = [];
  for (let index = from; index < Math.min(to, source.prose.length); index++) {
    const line = source.prose[index]!;
    for (const needle of needles) {
      const html = /^(\w+)=(["'])(.*)\2$/.exec(needle);
      if (html) {
        const escaped = html[3]!.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const re = new RegExp(`${html[1]}\\s*=\\s*(["'])${escaped}\\1`, "gi");
        for (const match of line.matchAll(re)) {
          const at = match.index!;
          if (!attribute || /["'=(<]/.test(line[at - 1] ?? ""))
            matches.push({ line: index + 1, column: at + 1 });
        }
        continue;
      }
      for (let at = line.indexOf(needle); at !== -1; at = line.indexOf(needle, at + 1)) {
        if (
          [...needles].some(
            (other) =>
              other !== needle &&
              other.length > needle.length &&
              line.slice(at, at + other.length) === other,
          )
        )
          continue;
        if (/[/\w-]/.test(line[at + needle.length] ?? "") && /[/\w-]$/.test(needle)) continue;
        if (attribute && !/["'=(<]/.test(line[at - 1] ?? "")) continue;
        matches.push({ line: index + 1, column: at + 1 });
      }
    }
  }
  matches.sort((a, b) => a.line - b.line || a.column - b.column);
  return matches[nth];
}
