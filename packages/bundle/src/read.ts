// Reads one build folder into chunks, their import graph, and the bytes each package takes in them: every JavaScript
// chunk, measured here, its imports of other chunks, and its sourcemap when the build wrote one.
import { hash } from "../../../shared/text.ts";

export type Size = { raw: number; gzip: number; brotli: number };

export type Chunk = Size & {
  /** The chunk's path in the build, such as `assets/index-B1xQ.js`. */
  name: string;
  imports: string[];
  dynamic: string[];
  /** Bytes by package name, `""` for the app's own code. Empty when the build has no sourcemaps. */
  packages: Map<string, Size>;
  /** Module paths, for finding Nuxt's default layout. */
  modules: string[];
  /** The chunk's code, kept only for a folder without sourcemaps. */
  code?: string;
};

export type Build = {
  chunks: Map<string, Chunk>;
  entries: string[];
  /** Whether any chunk has a sourcemap, so the sizes come with packages. */
  packages: boolean;
  /** How many chunks have no sourcemap; their bytes count as the app's own. */
  unmapped: number;
};

/** Reads a file under the root as text. Returns undefined when it doesn't exist. */
export type BundleReader = (path: string) => string | undefined | Promise<string | undefined>;
/** Lists the files under a folder, recursively, as paths relative to it. Returns undefined when it isn't a folder. */
export type BundleLister = (path: string) => string[] | undefined | Promise<string[] | undefined>;

export class Unreadable extends Error {}

const zero = (): Size => ({ raw: 0, gzip: 0, brotli: 0 });
const add = (into: Size, size: Size, share = 1) => {
  into.raw += size.raw * share;
  into.gzip += size.gzip * share;
  into.brotli += size.brotli * share;
};

/** The package a module path belongs to: what follows its last `node_modules/`, or `""` for the app's own code. */
export function packageOf(path: string): string {
  const at = path.lastIndexOf("node_modules/");
  if (at < 0) return "";
  const [scope = "", name = ""] = path.slice(at + 13).split("/");
  return scope.startsWith("@") ? `${scope}/${name}` : scope;
}

// JSON from a file, read field by field: a value that isn't what the reader expects reads as missing.
const record = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? // SAFETY: a non-null, non-array JSON value is an object, read by string keys; its values stay unknown.
      (value as Record<string, unknown>)
    : {};
const items = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
const string = (value: unknown): string => (typeof value === "string" ? value : "");
const parse = (text: string): unknown => JSON.parse(text);

// --- A build folder ------------------------------------------------------------------------------------------------

const B64 = new Map(
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
    .split("")
    .map((c, i) => [c, i]),
);

/** Characters of generated code per source, from a sourcemap's VLQ mappings. Unmapped code counts as `-1`. */
function charsBySource(code: string, mappings: string, sources: number): number[] {
  const out: number[] = Array.from({ length: sources + 1 }, () => 0);
  const lines = code.split("\n");
  let source = 0;
  const groups = mappings.split(";");
  for (let line = 0; line < lines.length; line++) {
    const length = lines[line]!.length + 1;
    const segments: [number, number][] = [];
    let column = 0;
    for (const segment of (groups[line] ?? "").split(",")) {
      if (!segment) continue;
      const fields: number[] = [];
      let value = 0;
      let shift = 0;
      for (const char of segment) {
        const digit = B64.get(char) ?? 0;
        value += (digit & 31) << shift;
        if (digit & 32) shift += 5;
        else {
          fields.push(value & 1 ? -(value >>> 1) : value >>> 1);
          value = 0;
          shift = 0;
        }
      }
      column += fields[0] ?? 0;
      if (fields.length >= 4) source += fields[1]!;
      // Segments with only a column map generated code to no source.
      segments.push([column, fields.length >= 4 ? source : -1]);
    }
    if (!segments.length) {
      out[sources]! += length;
      continue;
    }
    if (segments[0]![0] > 0) out[sources]! += segments[0]![0];
    for (let i = 0; i < segments.length; i++) {
      const [start, index] = segments[i]!;
      const end = i + 1 < segments.length ? segments[i + 1]![0] : length;
      out[index < 0 || index >= sources ? sources : index]! += Math.max(0, end - start);
    }
  }
  return out;
}

const STATIC = /(?:\bfrom|\bimport)\s*["'](\.{1,2}\/[^"'\n]+?\.m?js)["']/g;
const DYNAMIC = /\bimport\s*\(\s*["'`](\.{1,2}\/[^"'`\n]+?\.m?js)["'`]\s*\)/g;
// A worker's chunk is named only in `new URL(…, import.meta.url)`, by a path from the chunk or from the site's root.
const WORKER = /\bnew\s+URL\(\s*["'`]([^"'`\n]+?\.m?js)["'`]\s*,\s*import\.meta\.url/g;

function join(from: string, spec: string): string {
  const parts = from.split("/").slice(0, -1);
  for (const part of spec.split("/")) {
    if (part === "." || part === "") continue;
    if (part === "..") parts.pop();
    else parts.push(part);
  }
  return parts.join("/");
}

type Compress = (text: string) => Promise<[number, number]>;

async function compressor(): Promise<Compress> {
  let zlib: typeof import("node:zlib");
  try {
    zlib = await import("node:zlib");
  } catch {
    throw new Unreadable(
      "measuring a build folder needs Node's zlib, so render the document with Node",
    );
  }
  const { gzip, brotliCompress, constants } = zlib;
  const brotli = { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } };
  return (text) =>
    Promise.all([
      new Promise<number>((done, fail) =>
        gzip(text, { level: 9 }, (error, out) => (error ? fail(error) : done(out.length))),
      ),
      new Promise<number>((done, fail) =>
        brotliCompress(text, brotli, (error, out) => (error ? fail(error) : done(out.length))),
      ),
    ]);
}

// gzip -9 and brotli 11 take a while, so each chunk's sizes are kept per process, keyed by a hash of its contents
// rather than the contents, so a long-running server doesn't keep every build's code.
const measured = new Map<string, Promise<[number, number]>>();

// A read that fails counts as a file that isn't there: the caller only asks to tell a file from a folder, or to look
// for an optional manifest.
async function attempt(read: BundleReader, path: string): Promise<string | undefined> {
  try {
    return await read(path);
  } catch {
    return undefined;
  }
}

export async function fromFolder(
  folder: string,
  read: BundleReader,
  list: BundleLister,
): Promise<Build | undefined> {
  const files = await list(folder);
  if (!files) {
    if ((await attempt(read, folder)) !== undefined)
      throw new Unreadable("it's a file. Point it at the build's output folder, such as `dist`");
    return undefined;
  }
  const scripts = files.filter((file) => /\.m?js$/.test(file)).sort();
  if (!scripts.length)
    throw new Unreadable("it has no JavaScript files. Point it at the build's output folder");
  const compress = await compressor();
  const at = (file: string) => (folder ? `${folder}/${file}` : file);
  const chunks = new Map<string, Chunk>();
  let mapped = 0;
  // Read and compressed together: zlib's async calls run on Node's thread pool.
  const loaded = await Promise.all(
    scripts.map(async (name) => {
      const code = (await read(at(name))) ?? "";
      const key = `${code.length}:${hash(code)}`;
      let sizes = measured.get(key);
      if (!sizes) {
        sizes = compress(code);
        measured.set(key, sizes);
      }
      const map = files.includes(`${name}.map`) ? await read(at(`${name}.map`)) : undefined;
      return { name, code, sizes: await sizes, map };
    }),
  );
  for (const { name, code, sizes, map } of loaded) {
    const [gzip, brotli] = sizes;
    const raw = new TextEncoder().encode(code).length;
    const chunk: Chunk = {
      name,
      raw,
      gzip,
      brotli,
      imports: [],
      dynamic: [],
      packages: new Map(),
      modules: [],
    };
    for (const [, spec] of code.matchAll(STATIC)) chunk.imports.push(join(name, spec!));
    for (const [, spec] of code.matchAll(DYNAMIC)) chunk.dynamic.push(join(name, spec!));
    for (const [, spec] of code.matchAll(WORKER))
      chunk.dynamic.push(spec!.startsWith(".") ? join(name, spec!) : spec!.replace(/^\/+/, ""));
    let parsed: Record<string, unknown> = {};
    try {
      parsed = map ? record(parse(map)) : {};
    } catch {
      // A sourcemap that isn't JSON counts as none.
    }
    const sources = items(parsed.sources).map(string);
    const mappings = string(parsed.mappings);
    if (sources.length && mappings) {
      mapped++;
      chunk.modules = sources;
      const chars = charsBySource(code, mappings, sources.length);
      const total = chars.reduce((sum, n) => sum + n, 0) || 1;
      chars.forEach((n, index) => {
        if (!n) return;
        const owner = packageOf(sources[index] ?? "");
        const size = chunk.packages.get(owner) ?? zero();
        add(size, chunk, n / total);
        chunk.packages.set(owner, size);
      });
    } else chunk.code = code;
    chunks.set(name, chunk);
  }
  // A path from the site's root names the chunk that ends with it.
  const named = (path: string) =>
    chunks.has(path) ? path : [...chunks.keys()].find((name) => path.endsWith(`/${name}`));
  for (const chunk of chunks.values()) {
    chunk.imports = [...new Set(chunk.imports.filter((name) => chunks.has(name)))];
    chunk.dynamic = [...new Set(chunk.dynamic.flatMap((path) => named(path) ?? []))];
  }
  return {
    chunks,
    entries: await entriesOf(folder, chunks, read),
    packages: mapped > 0,
    unmapped: chunks.size - mapped,
  };
}

// The entry chunks: from Vite's manifest, else the page's module scripts, else the chunks nothing else imports. Vite
// writes both next to the assets folder, so the folder's parent is read too.
async function entriesOf(
  folder: string,
  chunks: Map<string, Chunk>,
  read: BundleReader,
): Promise<string[]> {
  const tryRead = (path: string) => attempt(read, path);
  const named = (path: string) => {
    const file = path.replace(/^\.?\//, "");
    return [...chunks.keys()].filter((name) => file === name || file.endsWith(`/${name}`));
  };
  const dirs = [folder];
  if (folder) dirs.push(folder.split("/").slice(0, -1).join("/"));
  for (const dir of dirs) {
    const at = (file: string) => (dir ? `${dir}/${file}` : file);
    const manifest = await tryRead(at(".vite/manifest.json"));
    if (manifest) {
      try {
        const entries = Object.values(record(parse(manifest))).flatMap((value) => {
          const entry = record(value);
          return entry.isEntry === true && string(entry.file) ? named(string(entry.file)) : [];
        });
        if (entries.length) return [...new Set(entries)];
      } catch {
        // A manifest that isn't JSON leaves the next guess.
      }
    }
    const html = await tryRead(at("index.html"));
    const scripts = [
      ...(html ?? "").matchAll(/<script\b[^>]*\btype=["']module["'][^>]*\bsrc=["']([^"']+)["']/g),
    ].flatMap(([, src]) => named(src!));
    if (scripts.length) return [...new Set(scripts)];
  }
  const guessed = guessEntries(chunks);
  if (guessed.length) return guessed;
  throw new Unreadable(
    "it doesn't show which chunk is the entry. Point it at the whole `dist`, or keep the build's `index.html` or `.vite/manifest.json` next to the assets folder",
  );
}

// Without them, the entry is where the graph starts. "Nothing imports it" isn't enough: a lazy chunk often imports
// shared code back from the entry. So a chunk loaded through `import()` is lazy, and so is a chunk such a target
// needs that the chunk loading the target doesn't. Of the rest, an entry is one that nothing else imports, unless the
// importer is in a cycle with it.
function guessEntries(chunks: Map<string, Chunk>): string[] {
  const reached = new Map<string, Set<string>>();
  const reach = (from: string) => {
    const known = reached.get(from);
    if (known) return known;
    const seen = new Set<string>();
    const stack = [from];
    for (let name = stack.pop(); name !== undefined; name = stack.pop())
      for (const next of chunks.get(name)?.imports ?? [])
        if (!seen.has(next)) {
          seen.add(next);
          stack.push(next);
        }
    reached.set(from, seen);
    return seen;
  };
  const targets = new Set([...chunks.values()].flatMap((chunk) => chunk.dynamic));
  // Only a loader that isn't a target itself counts, since the entry is never one.
  const loaders = [...chunks.values()].filter((chunk) => !targets.has(chunk.name));
  const lazy = (name: string) =>
    [...targets].some(
      (target) =>
        reach(target).has(name) &&
        loaders.some(
          (from) =>
            from.name !== name && from.dynamic.includes(target) && !reach(from.name).has(name),
        ),
    );
  const rest = [...chunks.keys()].filter((name) => !targets.has(name) && !lazy(name));
  return rest.filter((name) =>
    rest.every(
      (other) => chunks.get(other)?.imports.includes(name) !== true || reach(name).has(other),
    ),
  );
}
