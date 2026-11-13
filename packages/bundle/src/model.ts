import type { Build, Size } from "./read.ts";

/** What one build loads: every page (the entries, their static imports, and Nuxt's default layout) and the rest. */
export type Loads = {
  page: Size & { chunks: number };
  lazy: Size & { chunks: number };
  /** Every package's size, split into what every page loads and what loads later. */
  packages: Map<string, { page: Size; lazy: Size }>;
  /** Every chunk's gzip size and whether every page loads it, for a build without packages. */
  files: { name: string; gzip: number; page: boolean }[];
  /** Whether Nuxt's default layout counts toward every page. */
  layout: boolean;
  /** Each chunk without a sourcemap, where any package could hide, by its name and gzip bytes. */
  unmapped: Map<string, number>;
};

const zero = (): Size & { chunks: number } => ({ raw: 0, gzip: 0, brotli: 0, chunks: 0 });

function closure(build: Build, from: string[], into = new Set<string>()): Set<string> {
  const stack = [...from];
  while (stack.length) {
    const name = stack.pop()!;
    if (into.has(name) || !build.chunks.has(name)) continue;
    into.add(name);
    stack.push(...build.chunks.get(name)!.imports);
  }
  return into;
}

// Nuxt loads the default layout through `import()`, though every page that uses it waits for it. With modules, its
// chunk is the one holding `layouts/default.vue`; without, it's the `default:` entry of the layouts map in the code.
const LAYOUT =
  /\bdefault\s*:\s*[\w$]+\(\s*\(\)\s*=>\s*(?:[\w$]+\(\s*\(\)\s*=>\s*)?import\(\s*[`"']\.\/([^`"']+\.m?js)[`"']\s*\)/;

// Only a Nuxt build has one: an app of its own can name a lazy file `layouts/default.vue` too.
function layoutOf(build: Build, page: Set<string>): string | undefined {
  const chunks = [...page].map((name) => build.chunks.get(name)!);
  const nuxt = chunks.some(
    (chunk) =>
      chunk.code?.includes("__nuxt") ||
      chunk.modules.some((path) => /(^|\/)node_modules\/nuxt\//.test(path)),
  );
  if (!nuxt) return undefined;
  for (const chunk of build.chunks.values())
    if (chunk.modules.some((path) => /(^|\/)layouts\/default\.vue$/.test(path)))
      return page.has(chunk.name) ? undefined : chunk.name;
  for (const chunk of chunks) {
    const found = chunk.code?.match(LAYOUT)?.[1];
    if (!found) continue;
    const name = [...build.chunks.keys()].find((key) => key === found || key.endsWith(`/${found}`));
    if (name && !page.has(name)) return name;
  }
  return undefined;
}

export function loads(build: Build): Loads {
  const page = closure(build, build.entries);
  const layout = layoutOf(build, page);
  if (layout) closure(build, [layout], page);
  const out: Loads = {
    page: zero(),
    lazy: zero(),
    packages: new Map(),
    files: [],
    layout: !!layout,
    unmapped: new Map(),
  };
  for (const chunk of build.chunks.values()) {
    if (!chunk.modules.length) out.unmapped.set(chunk.name, chunk.gzip);
    const tier = page.has(chunk.name) ? out.page : out.lazy;
    tier.raw += chunk.raw;
    tier.gzip += chunk.gzip;
    tier.brotli += chunk.brotli;
    tier.chunks++;
    out.files.push({ name: chunk.name, gzip: chunk.gzip, page: page.has(chunk.name) });
    for (const [name, size] of chunk.packages) {
      if (!name) continue;
      const entry = out.packages.get(name) ?? {
        page: { raw: 0, gzip: 0, brotli: 0 },
        lazy: { raw: 0, gzip: 0, brotli: 0 },
      };
      const into = page.has(chunk.name) ? entry.page : entry.lazy;
      into.raw += size.raw;
      into.gzip += size.gzip;
      into.brotli += size.brotli;
      out.packages.set(name, entry);
    }
  }
  return out;
}

export type Change = {
  name: string;
  kind: "added" | "removed" | "moved-in" | "moved-out" | "changed";
  /** gzip bytes every page loads in each build. */
  page: [number, number];
  /** All of the package's gzip bytes in each build. */
  total: [number, number];
};

/**
 * Whether a package on one side only may still be on the other, hidden in code without a sourcemap that grew by at
 * least its size. Then nothing says it was added or removed. Growth per chunk, not the total: a `sw.js` both builds
 * ship without a map hides nothing, and one that shrank doesn't cancel a chunk that lost its map.
 */
export function unsure(name: string, before: Loads, after: Loads): boolean {
  const total = (sizes: { page: Size; lazy: Size }) => sizes.page.gzip + sizes.lazy.gzip;
  const growth = (from: Loads, to: Loads) =>
    [...to.unmapped].reduce(
      (sum, [chunk, bytes]) => sum + Math.max(0, bytes - (from.unmapped.get(chunk) ?? 0)),
      0,
    );
  const a = before.packages.get(name);
  const b = after.packages.get(name);
  // Compressed in another chunk, a package's gzip size shifts, so twice the growth is the bound, not the growth.
  if (a && !b) return total(a) <= 2 * growth(before, after);
  if (b && !a) return total(b) <= 2 * growth(after, before);
  return false;
}

// Below this, a package that only changed size is noise: a rebuild moves a few bytes around.
const NOISE = 100;

export function changes(before: Loads, after: Loads): Change[] {
  const out: Change[] = [];
  for (const name of new Set([...before.packages.keys(), ...after.packages.keys()])) {
    if (unsure(name, before, after)) continue;
    const a = before.packages.get(name);
    const b = after.packages.get(name);
    const page: [number, number] = [a?.page.gzip ?? 0, b?.page.gzip ?? 0];
    const total: [number, number] = [
      (a?.page.gzip ?? 0) + (a?.lazy.gzip ?? 0),
      (b?.page.gzip ?? 0) + (b?.lazy.gzip ?? 0),
    ];
    const kind: Change["kind"] | undefined = !a
      ? "added"
      : !b
        ? "removed"
        : !page[0] && page[1]
          ? "moved-in"
          : page[0] && !page[1]
            ? "moved-out"
            : Math.abs(total[1] - total[0]) >= NOISE || Math.abs(page[1] - page[0]) >= NOISE
              ? "changed"
              : undefined;
    if (kind) out.push({ name, kind, page, total });
  }
  const weight = (c: Change) =>
    Math.abs(c.page[1] - c.page[0]) * 4 + Math.abs(c.total[1] - c.total[0]);
  return out.sort((x, y) => weight(y) - weight(x) || x.name.localeCompare(y.name));
}
