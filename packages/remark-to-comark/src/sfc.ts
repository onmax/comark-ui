/** A script inside a Vue, Svelte, or Astro component: its code, where it starts in the file, and a name oxc can parse it by. */
export interface ScriptBlock {
  code: string;
  start: number;
  name: string;
}

export const COMPONENT = /\.(vue|svelte|astro)$/;

/** The scripts of a component file, or undefined for a plain JS/TS file. */
export function scriptBlocks(source: string, file: string): ScriptBlock[] | undefined {
  if (!COMPONENT.test(file)) return undefined;
  const blocks: ScriptBlock[] = [];
  // Astro's component script is the fenced block at the top, and it's always TypeScript.
  const fence = file.endsWith(".astro") ? /^---[ \t]*\r?\n([\s\S]*?)\r?\n---/.exec(source) : null;
  if (fence)
    blocks.push({
      code: fence[1]!,
      start: fence.index + fence[0].indexOf(fence[1]!),
      name: `${file}.ts`,
    });
  const fenceEnd = fence ? fence.index + fence[0].length : 0;
  for (const match of source.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/g)) {
    // `<script>` inside the Astro frontmatter is part of its code (a string, say), not a block of its own.
    if (match.index < fenceEnd) continue;
    const attributes = match[1]!;
    if (/\btype=["'](?!module|text\/javascript)/.test(attributes)) continue;
    const ts = /\blang\s*=\s*["']ts["']/.test(attributes) || file.endsWith(".astro");
    const jsx = /\blang\s*=\s*["'](tsx|jsx)["']/.exec(attributes)?.[1];
    blocks.push({
      code: match[2]!,
      start: match.index + match[0].indexOf(">") + 1,
      name: `${file}.${jsx ?? (ts ? "ts" : "js")}`,
    });
  }
  return blocks;
}

/** The 1-based line a block starts on, so findings inside it point at the component file. */
export const lineOffset = (source: string, block: ScriptBlock) =>
  source.slice(0, block.start).split("\n").length - 1;
