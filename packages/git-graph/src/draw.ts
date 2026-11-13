import type { ElementNode, Node } from "comark";
import type { Graph, PickStatus } from "./read.ts";

// The geometry every renderer shares: rows are a fixed height, so the lines drawn here meet the rows the renderers lay out.
export const ROW = 34;
export const NOTES_ROW = 52;
const LANE = 18;
const PAD = 14;
const LANE_COLORS = 7;

export const STATUS_WORDS: Record<PickStatus, string> = {
  clean: "applies clean",
  conflict: "conflict",
  has: "already there",
};

interface Span {
  start: number;
  first: number;
  last: number;
  end: number;
}

/** Each lane's rows, and its column: the trunk keeps the first; a branch stacked on another's tip continues in that
 * column, like a stack in Graphite; any other takes the lowest column free from the row before it starts to the row
 * after it ends, so a column frees up once its branch merges. */
function columns(graph: Graph) {
  const { commits, lanes } = graph;
  const rows: number[][] = lanes.map(() => []);
  commits.forEach((commit, i) => {
    rows[commit.lane].push(i);
    for (const lane of commit.picks.keys()) rows[lane].push(i);
  });
  const spans: (Span | undefined)[] = lanes.map((lane, l) => {
    const own = rows[l];
    if (!own.length) return undefined;
    const first = Math.min(...own);
    const last = Math.max(...own);
    const lastCommit = Math.max(-1, ...own.filter((row) => commits[row].lane === l));
    const merged = commits.findIndex(
      (commit, i) =>
        commit.mergeFrom !== undefined &&
        commits[commit.mergeFrom].lane === l &&
        commit.lane !== l &&
        i > lastCommit,
    );
    return { start: lane.from ?? first, first, last, end: merged >= 0 ? merged : last };
  });
  const column: number[] = lanes.map(() => -1);
  const taken: { lane: number; span: Span }[][] = [];
  const free = (c: number, span: Span, except = -1) =>
    (taken[c] ?? []).every(
      (t) => t.lane === except || span.end + 1 < t.span.start || span.start > t.span.end + 1,
    );
  const order = lanes.map((_, l) => l).filter((l) => spans[l]);
  order.sort((a, b) =>
    a === 0 ? -1 : b === 0 ? 1 : (spans[a]?.start ?? 0) - (spans[b]?.start ?? 0) || a - b,
  );
  for (const l of order) {
    const span = spans[l];
    if (!span) continue;
    const from = lanes[l].from;
    const parent = from === undefined ? -1 : commits[from].lane;
    const parentSpan = spans[parent];
    let c = -1;
    if (l === 0) c = 0;
    else if (
      parent > 0 &&
      parentSpan &&
      from === parentSpan.last &&
      parentSpan.end === parentSpan.last &&
      free(column[parent], span, parent)
    )
      c = column[parent];
    else for (let k = 1; c < 0; k++) if (free(k, span)) c = k;
    (taken[c] ??= []).push({ lane: l, span });
    column[l] = c;
  }
  const steps: Map<number, number>[] = lanes.map(() => new Map());
  const count = lanes.map(() => 0);
  commits.forEach((commit, i) => {
    for (const [lane, pick] of commit.picks)
      if (pick.status !== "has") steps[lane].set(i, ++count[lane]);
  });
  return { spans, column, columns: Math.max(0, ...column) + 1, steps, count };
}

const esc = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const short = (name: string) => name.split("/").pop() || name;

export interface Drawing {
  /** The lines and dots, an SVG string the renderers place beside the rows. */
  svg: string;
  width: number;
  height: number;
  rows: ElementNode[];
  legend: ElementNode[];
  summary: string;
}

/** Lays out a graph newest first, as git prints it, or oldest first with `reverse`. */
export function draw(graph: Graph, reverse: boolean): Drawing {
  const { commits, lanes } = graph;
  const { spans, column, columns: count, steps, count: picks } = columns(graph);
  const display = commits.map((_, i) => i);
  if (!reverse) display.reverse();
  const pos: number[] = [];
  display.forEach((row, k) => {
    pos[row] = k;
  });
  // Notes and picks read left to right, in the order of their columns.
  const picksOf = (i: number) =>
    [...commits[i].picks].sort(([a], [b]) => column[a] - column[b] || a - b);
  const notes = (i: number) =>
    picksOf(i).filter(([, pick]) => pick.status === "conflict" || pick.files);
  const heights = display.map((row) => (notes(row).length ? NOTES_ROW : ROW));
  const tops: number[] = [];
  heights.forEach((h, k) => {
    tops[k] = k ? tops[k - 1] + heights[k - 1] : 0;
  });
  const height = heights.reduce((a, b) => a + b, 0);
  const width = PAD * 2 + (count - 1) * LANE;
  const X = (lane: number) => PAD + column[lane] * LANE;
  const Y = (row: number) => tops[pos[row]] + heights[pos[row]] / 2;
  const color = (lane: number) => `cgg-l${lane % LANE_COLORS}`;
  const curve = (x1: number, y1: number, x2: number, y2: number) =>
    `C${x1} ${(y1 + y2) / 2} ${x2} ${(y1 + y2) / 2} ${x2} ${y2}`;

  const lines: string[] = [];
  lanes.forEach((lane, l) => {
    const span = spans[l];
    if (!span) return;
    const x = X(l);
    let d = `M${x} ${Y(span.first)}`;
    if (lane.from !== undefined && span.start < span.first) {
      const px = X(commits[lane.from].lane);
      d = `M${px} ${Y(span.start)}${curve(px, Y(span.start), x, Y(span.start + 1))}`;
    }
    lines.push(`<path class="${color(l)}" d="${d}V${Y(span.last)}"/>`);
  });
  commits.forEach((commit, i) => {
    if (commit.mergeFrom === undefined) return;
    const source = commits[commit.mergeFrom].lane;
    const xs = X(source);
    lines.push(
      `<path class="${color(source)}" d="M${xs} ${Y(commit.mergeFrom)}V${Y(i - 1)}${curve(xs, Y(i - 1), X(commit.lane), Y(i))}"/>`,
    );
  });
  const dots: string[] = [];
  commits.forEach((commit, i) => {
    const x = X(commit.lane);
    const y = Y(i);
    if (commit.elided)
      dots.push(
        `<rect class="cgg-gap" x="${x - 5}" y="${y - 9}" width="10" height="18"/>${[-6, 0, 6].map((dy) => `<circle class="cgg-ellipsis ${color(commit.lane)}" cx="${x}" cy="${y + dy}" r="1.3"/>`).join("")}`,
      );
    else if (commit.mergeFrom !== undefined)
      dots.push(`<circle class="cgg-merge ${color(commit.lane)}" cx="${x}" cy="${y}" r="5"/>`);
    else
      dots.push(`<circle class="cgg-commit ${color(commit.lane)}" cx="${x}" cy="${y}" r="4.5"/>`);
    for (const [lane, pick] of commit.picks) {
      const px = X(lane);
      const tip = `<title>${esc(`${commit.ref ? `#${commit.ref} ` : ""}${commit.text} → ${lanes[lane].name}: ${STATUS_WORDS[pick.status]}${pick.files ? ` (${pick.files})` : ""}`)}</title>`;
      if (pick.status === "has")
        dots.push(`<circle class="cgg-has" cx="${px}" cy="${y}" r="3.5">${tip}</circle>`);
      else
        dots.push(
          `<g class="cgg-pick" data-status="${pick.status}"><circle cx="${px}" cy="${y}" r="8"/><text x="${px}" y="${y}">${steps[lane].get(i) ?? ""}</text>${tip}</g>`,
        );
    }
  });
  const svg = `<svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" aria-hidden="true" focusable="false"><g class="cgg-edges">${lines.join("")}</g>${dots.join("")}</svg>`;

  const tipOf = lanes.map((_, l) =>
    commits.findLastIndex((commit) => commit.lane === l && !commit.elided),
  );
  const rows: ElementNode[] = display.map((i, k) => {
    const commit = commits[i];
    const lane = lanes[commit.lane];
    const attrs = { class: "cgg-row", ...(heights[k] === NOTES_ROW && { "data-notes": "" }) };
    if (commit.elided)
      return [
        "div",
        attrs,
        [
          "div",
          { class: "cgg-line" },
          [
            "span",
            { class: "cgg-subject cgg-muted" },
            `${commit.elided} more ${commit.elided === 1 ? "commit" : "commits"}`,
          ],
        ],
      ];
    const line: Node[] = [
      [
        "span",
        { class: "cgg-subject" },
        ...(commit.ref
          ? [["span", { class: "cgg-ref" }, `#${commit.ref}`] satisfies ElementNode, " "]
          : []),
        commit.text,
      ],
    ];
    lanes.forEach((other, l) => {
      if (tipOf[l] !== i) return;
      line.push([
        "span",
        {
          class: "cgg-branch",
          "data-lane": String(l % LANE_COLORS),
          ...(other.deleted && { "data-deleted": "" }),
          title: other.deleted ? `${other.name}, merged and deleted` : other.name,
        },
        other.name,
      ]);
      if (other.deleted && other.ref) line.push(["span", { class: "cgg-muted" }, `#${other.ref}`]);
    });
    for (const tag of commit.tags) line.push(["span", { class: "cgg-tag" }, tag]);
    line.push(["span", { class: "cgg-sha" }, commit.sha]);
    const row: Node[] = [["div", { class: "cgg-line" }, ...line]];
    const shown = notes(i);
    if (shown.length)
      row.push([
        "div",
        { class: "cgg-notes" },
        ...shown.map(([l, pick]): ElementNode => [
          "span",
          {
            class: "cgg-note",
            "data-status": pick.status,
            title: `${lanes[l].name}: ${STATUS_WORDS[pick.status]}${pick.files ? `, ${pick.files}` : ""}`,
          },
          ["b", {}, short(lanes[l].name)],
          ` ${STATUS_WORDS[pick.status]}${pick.files ? ` · ${pick.files}` : ""}`,
        ]),
      ]);
    // The dots are hidden from screen readers, so each pick is said in words.
    const said = picksOf(i).map(
      ([l, pick]) =>
        `${lanes[l].name}: ${STATUS_WORDS[pick.status]}${steps[l].get(i) ? `, pick ${steps[l].get(i)}` : ""}${pick.files ? ` in ${pick.files}` : ""}`,
    );
    if (lane && said.length) row.push(["span", { class: "cgg-sr" }, `${said.join("; ")}.`]);
    return ["div", attrs, ...row];
  });

  const used = new Set(
    commits.flatMap((commit) => [...commit.picks.values()].map((pick) => pick.status)),
  );
  const legend: ElementNode[] = (["clean", "conflict", "has"] as const)
    .filter((status) => used.has(status))
    .map((status) => [
      "span",
      { class: "cgg-key", "data-status": status },
      STATUS_WORDS[status][0].toUpperCase() + STATUS_WORDS[status].slice(1),
    ]);
  if (commits.some((commit) => commit.elided))
    legend.push(["span", { class: "cgg-key", "data-status": "elided" }, "Commits left out"]);
  const branches = lanes.filter((_, l) => spans[l]).length;
  const total = picks.reduce((a, b) => a + b, 0);
  const real = commits.filter((commit) => !commit.elided).length;
  const summary = `${branches} ${branches === 1 ? "branch" : "branches"} · ${total ? `${total} ${total === 1 ? "pick" : "picks"}` : `${real} ${real === 1 ? "commit" : "commits"}`}`;
  return { svg, width, height, rows, legend, summary };
}
