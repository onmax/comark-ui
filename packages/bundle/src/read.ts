// Reads one build into chunks, their import graph, and the bytes each package takes in them. Two inputs: a build
// folder (its JavaScript chunks, measured here, and their sourcemaps when the build wrote them), or a Sonda JSON
// report, which already carries every size and the module graph.

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
  /** Whether the sizes come with packages: a sourcemap per chunk, or a Sonda report. */
  packages: boolean;
  /** What measured it, for the footer: `gzip -9 · brotli 11` or `Sonda 0.14.0`. */
  tool: string;
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

// --- Sonda ---------------------------------------------------------------------------------------------------------

// JSON from a file, read field by field: a value that isn't what the reader expects reads as missing.
const record = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? // SAFETY: a non-null, non-array JSON value is an object, read by string keys; its values stay unknown.
      (value as Record<string, unknown>)
    : {};
const items = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
const string = (value: unknown): string => (typeof value === "string" ? value : "");
const bytes = (value: unknown): number =>
  typeof value === "number" && Number.isFinite(value) ? value : 0;
const parse = (text: string): unknown => JSON.parse(text);

type SondaResource = { kind: string; name: string; parent: string } & Size;

function resource(value: unknown): SondaResource {
  const r = record(value);
  return {
    kind: string(r.kind),
    name: string(r.name),
    parent: string(r.parent),
    raw: bytes(r.uncompressed),
    gzip: bytes(r.gzip),
    brotli: bytes(r.brotli),
  };
}

export function fromSonda(json: string): Build {
  let report: Record<string, unknown>;
  try {
    report = record(parse(json));
  } catch {
    throw new Unreadable("it isn't JSON");
  }
  const metadata = record(report.metadata);
  if (!string(metadata.version) || !Array.isArray(report.resources))
    throw new Unreadable("it isn't a Sonda report: it has no `metadata.version` or `resources`");
  if (metadata.gzip !== true)
    throw new Unreadable("the Sonda report has no gzip sizes. Set `gzip: true` in Sonda's options");
  const resources = items(report.resources).map(resource);
  const chunks = new Map<string, Chunk>();
  for (const r of resources)
    if (r.kind === "asset" && /\.m?js$/.test(r.name))
      chunks.set(r.name, {
        name: r.name,
        raw: r.raw,
        gzip: r.gzip,
        brotli: r.brotli,
        imports: [],
        dynamic: [],
        packages: new Map(),
        modules: [],
      });
  const home = new Map<string, string>();
  for (const r of resources) {
    const chunk = r.kind === "chunk" ? chunks.get(r.parent) : undefined;
    if (!chunk) continue;
    home.set(r.name, chunk.name);
    chunk.modules.push(r.name);
    const name = packageOf(r.name);
    const size = chunk.packages.get(name) ?? zero();
    add(size, r);
    chunk.packages.set(name, size);
  }
  const targeted = new Set<string>();
  const entrypoints: string[] = [];
  for (const c of items(report.connections).map((value) => {
    const connection = record(value);
    return {
      kind: string(connection.kind),
      source: string(connection.source),
      target: string(connection.target),
    };
  })) {
    if (c.kind === "entrypoint") {
      if (chunks.has(c.source)) entrypoints.push(c.source);
      continue;
    }
    const from = home.get(c.source);
    const to = home.get(c.target);
    if (!from || !to || from === to) continue;
    const owner = chunks.get(from);
    if (!owner) continue;
    const list = c.kind === "dynamic-import" ? owner.dynamic : owner.imports;
    if (!list.includes(to)) list.push(to);
    targeted.add(to);
  }
  const roots = entrypoints.filter((name) => !targeted.has(name));
  return {
    chunks,
    entries: roots.length ? roots : entrypoints,
    packages: true,
    tool: `Sonda ${string(metadata.version)}`,
  };
}

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
      "measuring a build folder needs Node's zlib. Point it at a Sonda report instead",
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

// gzip -9 and brotli 11 take a while, so each chunk's sizes are kept per process by its contents.
const measured = new Map<string, Promise<[number, number]>>();

export async function fromFolder(
  folder: string,
  read: BundleReader,
  list: BundleLister,
): Promise<Build | undefined> {
  const files = await list(folder);
  if (!files) return undefined;
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
      let sizes = measured.get(code);
      if (!sizes) {
        sizes = compress(code);
        measured.set(code, sizes);
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
  for (const chunk of chunks.values()) {
    chunk.imports = [...new Set(chunk.imports.filter((name) => chunks.has(name)))];
    chunk.dynamic = [...new Set(chunk.dynamic.filter((name) => chunks.has(name)))];
  }
  return {
    chunks,
    entries: await entriesOf(folder, chunks, read),
    packages: mapped === chunks.size,
    tool: "gzip -9 · brotli 11",
  };
}

// The entry chunks: from Vite's manifest, else the page's module scripts, else the chunks nothing else imports. Vite
// writes both next to the assets folder, so the folder's parent is read too.
async function entriesOf(
  folder: string,
  chunks: Map<string, Chunk>,
  read: BundleReader,
): Promise<string[]> {
  const tryRead = async (path: string) => {
    try {
      return await read(path);
    } catch {
      return undefined;
    }
  };
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
  const referenced = new Set(
    [...chunks.values()].flatMap((chunk) => [...chunk.imports, ...chunk.dynamic]),
  );
  return [...chunks.keys()].filter((name) => !referenced.has(name));
}
