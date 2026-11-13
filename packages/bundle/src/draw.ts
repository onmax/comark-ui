import type { ElementNode } from "comark";
import { changes, unsure, type Change, type Loads } from "./model.ts";

const counted = (n: number, one: string) => `${n} ${n === 1 ? one : `${one}s`}`;

/** kB and MB as the build tools print them: 1 kB is 1000 bytes. */
export function size(bytes: number): string {
  const kb = bytes / 1000;
  return kb >= 1000 ? `${(kb / 1000).toFixed(2)} MB` : `${kb.toFixed(1)} kB`;
}
const rounded = (bytes: number) => Math.round(bytes / 100);
const delta = (bytes: number) =>
  rounded(bytes) === 0 ? "±0" : `${bytes > 0 ? "+" : "−"}${size(Math.abs(bytes))}`;
const verdict = (bytes: number) => (rounded(bytes) === 0 ? "same" : bytes < 0 ? "better" : "worse");
const percent = (a: number, b: number) => (a ? `${((Math.abs(b - a) / a) * 100).toFixed(1)}%` : "");

const tip = (tier: Loads["page"], other?: Loads["page"]) =>
  other
    ? `raw ${size(other.raw)} → ${size(tier.raw)}, brotli ${size(other.brotli)} → ${size(tier.brotli)}, ${other.chunks} → ${counted(tier.chunks, "chunk")}`
    : `raw ${size(tier.raw)}, brotli ${size(tier.brotli)}, ${counted(tier.chunks, "chunk")}`;

const list = (names: string[]) =>
  names.length > 3
    ? `${names.slice(0, 3).join(", ")} and ${names.length - 3} more`
    : names.join(", ");

// Nuxt loads its default layout through `import()`, but every page that uses it waits for it.
const LAYOUT = " · every page counts the default layout";

// --- Changes: the number, a bar per build, and a sentence --------------------------------------------------------

type Segment = { name: string; bytes: number; kind: string };

function bar(label: string, total: number, segments: Segment[], max: number): ElementNode {
  const known = segments.reduce((sum, s) => sum + s.bytes, 0);
  let x = 0;
  const parts: ElementNode[] = [];
  const small: { name: string; at: number }[] = [];
  for (const s of [{ name: "", bytes: Math.max(0, total - known), kind: "rest" }, ...segments]) {
    if (s.bytes <= 0) continue;
    const width = (s.bytes / max) * 100;
    parts.push([
      "span",
      {
        class: "cbr-seg",
        "data-kind": s.kind,
        style: `width:${width.toFixed(2)}%`,
        title: s.name ? `${s.name}: ${size(s.bytes)}` : `${size(s.bytes)} that didn't change`,
      },
      ...(s.name && width >= 14 ? [s.name] : []),
    ]);
    if (s.name && width < 14) small.push({ name: s.name, at: x + width / 2 });
    x += width;
  }
  // Names too long for their segment go under the bar, on a second line where two would overlap.
  const lanes: [number, number][][] = [];
  const names = small.map(({ name, at }): ElementNode => {
    const right = at > 60;
    const width = name.length * 1.1 + 1;
    const span: [number, number] = right ? [at - width, at] : [at, at + width];
    let lane = lanes.findIndex((taken) => taken.every(([a, b]) => span[1] < a || span[0] > b));
    if (lane < 0) lane = lanes.push([]) - 1;
    lanes[lane]!.push(span);
    return [
      "span",
      {
        class: "cbr-name",
        "data-side": right ? "right" : "left",
        style: `top:${lane}rem;${right ? `right:${(100 - at).toFixed(2)}%` : `left:${at.toFixed(2)}%`}`,
      },
      name,
    ];
  });
  const lines: ElementNode[] = [["span", { class: "cbr-track" }, ...parts]];
  if (names.length)
    lines.push(["span", { class: "cbr-names", style: `height:${lanes.length}rem` }, ...names]);
  return [
    "div",
    { class: "cbr-bar" },
    ["span", { class: "cbr-bar-l" }, label],
    ["span", { class: "cbr-bar-t" }, ...lines],
  ];
}

function sentence(before: Loads, after: Loads, found: Change[]): string {
  const d = after.page.gzip - before.page.gzip;
  const head =
    rounded(d) === 0
      ? "Every page loads the same"
      : `Every page ${d < 0 ? "down" : "up"} ${size(Math.abs(d))} (${percent(before.page.gzip, after.page.gzip)})`;
  const of = (kind: Change["kind"]) => found.flatMap((c) => (c.kind === kind ? [c.name] : []));
  const parts = (
    [
      [of("removed"), "removed"],
      [of("moved-out"), "moved out of every page"],
      [of("moved-in"), "moved into every page"],
      [of("added"), "added"],
    ] as const
  )
    .filter(([names]) => names.length)
    .map(([names, what]) => `${list(names)} ${what}`);
  return parts.length ? `${head}: ${parts.join("; ")}` : head;
}

function changesPanel(before: Loads, after: Loads, found: Change[], tool: string): ElementNode[] {
  const segments = (side: 0 | 1): Segment[] =>
    found.flatMap((c): Segment[] => {
      const bytes = c.page[side];
      const kind =
        side === 0
          ? c.kind === "removed" || c.kind === "moved-out"
            ? c.kind
            : ""
          : c.kind === "added" || c.kind === "moved-in"
            ? c.kind
            : "";
      return bytes && kind ? [{ name: c.name, bytes, kind }] : [];
    });
  const max = Math.max(before.page.gzip, after.page.gzip);
  const d = after.page.gzip - before.page.gzip;
  return [
    [
      "div",
      { class: "cbr-top", title: tip(after.page, before.page) },
      ["span", { class: "cbr-big" }, size(after.page.gzip)],
      ["span", { class: "cbr-pill", "data-verdict": verdict(d) }, delta(d)],
    ],
    ["div", { class: "cbr-sub" }, `every page, was ${size(before.page.gzip)} before`],
    [
      "div",
      { class: "cbr-bars" },
      bar("before", before.page.gzip, segments(0), max),
      bar("after", after.page.gzip, segments(1), max),
    ],
    [
      "div",
      { class: "cbr-foot" },
      ["div", { class: "cbr-foot-1" }, sentence(before, after, found)],
      [
        "div",
        { class: "cbr-foot-2" },
        `Lazy ${size(after.lazy.gzip)} (${delta(after.lazy.gzip - before.lazy.gzip)})${before.layout || after.layout ? LAYOUT : ""} · ${tool}`,
      ],
    ],
  ];
}

// --- Contents: a treemap of what every page loads and what loads later -------------------------------------------

type Item = { name: string; bytes: number; kind: string; note: string };
type Tile = Item & { x: number; y: number; w: number; h: number };

/** A squarified treemap: rows of tiles kept as close to square as the space allows. */
function squarify(items: Item[], width: number, height: number): Tile[] {
  const out: Tile[] = [];
  const total = items.reduce((sum, item) => sum + item.bytes, 0);
  if (!total) return out;
  let [x, y, w, h] = [0, 0, width, height];
  let rest = items.map((item) => ({ ...item, area: (item.bytes / total) * w * h }));
  const worst = (row: typeof rest, side: number) => {
    const sum = row.reduce((s, r) => s + r.area, 0);
    const big = Math.max(...row.map((r) => r.area));
    const tiny = Math.min(...row.map((r) => r.area));
    return Math.max((side * side * big) / (sum * sum), (sum * sum) / (side * side * tiny));
  };
  while (rest.length) {
    const side = Math.min(w, h);
    let row = [rest[0]!];
    let best = worst(row, side);
    for (const next of rest.slice(1)) {
      const score = worst([...row, next], side);
      if (score > best) break;
      row = [...row, next];
      best = score;
    }
    const sum = row.reduce((s, r) => s + r.area, 0);
    if (w >= h) {
      const across = sum / h;
      let top = y;
      for (const { area, ...r } of row) {
        out.push({ ...r, x, y: top, w: across, h: area / across });
        top += area / across;
      }
      x += across;
      w -= across;
    } else {
      const down = sum / w;
      let left = x;
      for (const { area, ...r } of row) {
        out.push({ ...r, x: left, y, w: area / down, h: down });
        left += area / down;
      }
      y += down;
      h -= down;
    }
    rest = rest.slice(row.length);
  }
  return out;
}

const TILES = 14;
// The treemap is laid out for the 700px a 728px column leaves, and scales with the card.
const W = 700;
const H = 200;

function groupItems(after: Loads, before: Loads | undefined, page: boolean, packages: boolean) {
  const items: Item[] = [];
  const pick = (sizes: { page: { gzip: number }; lazy: { gzip: number } } | undefined) =>
    sizes ? (page ? sizes.page : sizes.lazy).gzip : 0;
  if (packages) {
    for (const [name, sizes] of after.packages) {
      const bytes = pick(sizes);
      if (!bytes) continue;
      const old = before?.packages.get(name);
      const was = pick(old);
      const kind =
        !before || (!old && unsure(name, before, after))
          ? "same"
          : !old
            ? "added"
            : !was
              ? "moved-in"
              : Math.abs(bytes - was) >= 1000
                ? "changed"
                : "same";
      const note = {
        added: "added",
        "moved-in": "moved in",
        changed: delta(bytes - was),
        same: "",
      }[kind];
      items.push({ name, bytes, kind, note });
    }
    if (before)
      for (const [name, sizes] of before.packages) {
        const was = pick(sizes);
        const now = after.packages.get(name);
        if (!was || pick(now) || unsure(name, before, after)) continue;
        // A package that left keeps its old area, hatched, so the biggest change stays in the picture.
        items.push({
          name,
          bytes: was,
          kind: now ? "moved-out" : "removed",
          note: now ? "moved out" : "removed",
        });
      }
  } else
    for (const file of after.files)
      if (file.page === page)
        items.push({ name: file.name.split("/").pop()!, bytes: file.gzip, kind: "same", note: "" });
  items.sort((a, b) => b.bytes - a.bytes);
  const shown = items.slice(0, TILES);
  const own = shown
    .filter((i) => i.kind !== "removed" && i.kind !== "moved-out")
    .reduce((s, i) => s + i.bytes, 0);
  const rest = (page ? after.page : after.lazy).gzip - own;
  if (rest > 0)
    shown.push({
      name: packages ? "app code" : "smaller chunks",
      bytes: rest,
      kind: "rest",
      note: packages ? "and smaller packages" : "",
    });
  return shown.sort((a, b) => b.bytes - a.bytes);
}

function treemap(after: Loads, before: Loads | undefined, packages: boolean): ElementNode {
  const groups = [
    { label: "Every page", items: groupItems(after, before, true, packages) },
    { label: "Lazy", items: groupItems(after, before, false, packages) },
  ].filter((g) => g.items.length);
  const sum = (items: Item[]) => items.reduce((t, i) => t + i.bytes, 0);
  const all = groups.reduce((s, g) => s + sum(g.items), 0);
  return [
    "div",
    { class: "cbr-map" },
    ...groups.map((g): ElementNode => {
      const share = groups.length > 1 ? Math.min(0.75, Math.max(0.25, sum(g.items) / all)) : 1;
      const width = W * share;
      const pct = (v: number, of: number) => ((v / of) * 100).toFixed(2);
      return [
        "div",
        { class: "cbr-group", style: `flex:${share.toFixed(3)} 1 0` },
        ["div", { class: "cbr-group-l" }, g.label],
        [
          "div",
          { class: "cbr-tiles" },
          ...squarify(g.items, width, H).map((t): ElementNode => [
            "span",
            {
              class: "cbr-tile",
              "data-kind": t.kind,
              style: `left:${pct(t.x, width)}%;top:${pct(t.y, H)}%;width:${pct(t.w, width)}%;height:${pct(t.h, H)}%`,
              title: `${t.name}: ${size(t.bytes)}${t.note ? `, ${t.note}` : ""}`,
            },
            // A name shows whole or not at all: a cut-off one reads as noise, and the tooltip has it.
            ...(t.w >= t.name.length * 6.8 + 16 && t.h >= 24 ? [t.name] : []),
          ]),
        ],
      ];
    }),
  ];
}

const muted = (text: string): ElementNode => ["div", { class: "cbr-foot-2" }, text];
const chunks = (l: Loads) => l.page.chunks + l.lazy.chunks;

// --- The card ----------------------------------------------------------------------------------------------------

/**
 * A `::bundle`'s body. Two builds show what changed: the number, a bar per build, and a sentence, with what the new
 * build holds behind a native `<details>`, so it reads with no script. One build shows its number and what it holds.
 */
export function card(
  before: Loads | undefined,
  after: Loads,
  packages: boolean,
  tool: string,
): ElementNode[] {
  const holds = packages
    ? `${counted(after.packages.size, "package")} · ${counted(chunks(after), "chunk")}`
    : counted(chunks(after), "chunk");
  const note = packages
    ? after.packages.size > TILES
      ? `The ${TILES} largest packages in each part. Area is gzip size.`
      : "Area is gzip size."
    : "No sourcemaps, so chunks instead of packages. Area is gzip size.";
  if (!before)
    return [
      [
        "div",
        { class: "cbr-panel" },
        [
          "div",
          { class: "cbr-top", title: tip(after.page) },
          ["span", { class: "cbr-big" }, size(after.page.gzip)],
        ],
        ["div", { class: "cbr-sub" }, `every page · lazy ${size(after.lazy.gzip)}`],
        treemap(after, undefined, packages),
        [
          "div",
          { class: "cbr-foot" },
          muted(holds),
          muted(`${note.slice(0, -1)}${after.layout ? LAYOUT : ""} · ${tool}`),
        ],
      ],
    ];
  const found = packages ? changes(before, after) : [];
  return [
    ["div", { class: "cbr-panel" }, ...changesPanel(before, after, found, tool)],
    [
      "details",
      { class: "cbr-more" },
      ["summary", {}, "What's in the bundle", ["span", { class: "cbr-count" }, holds]],
      [
        "div",
        { class: "cbr-more-body" },
        treemap(after, before, packages),
        muted(
          found.some((c) => c.kind === "removed" || c.kind === "moved-out")
            ? `${note} Hatched tiles are what left, at their old size.`
            : note,
        ),
      ],
    ],
  ];
}
