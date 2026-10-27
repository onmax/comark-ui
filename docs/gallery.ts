// The component gallery's script. It pans and zooms the canvas, shows each frame in its color scheme and as tall as its
// content, filters the examples, and edits them: an example's props, a copy of it, or one copy per value of a prop. A changed cell renders
// in the browser with the plugins its page used, which load with the first change, and the changes ride in the URL's
// `edit` parameter, so a link or a screenshot shows them.
import { cellDocument } from "./preview.ts";

interface Cell {
  group: string;
  label: string;
  source: string;
}
interface Added {
  id: string;
  after: string;
  label: string;
  source: string;
}

function find<T extends Element>(selector: string, type: new () => T) {
  const element = document.querySelector(selector);
  if (!(element instanceof type)) throw new Error(`The gallery needs ${selector}.`);
  return element;
}
const gallery = find(".gallery", HTMLDivElement);
const canvas = find(".gallery-canvas", HTMLDivElement);
const sizer = find(".gallery-sizer", HTMLDivElement);
const stage = find(".gallery-stage", HTMLDivElement);
const level = find(".gallery-zoom-level", HTMLButtonElement);
const inspector = find(".gallery-inspector", HTMLElement);
const title = find("#gallery-inspector-title", HTMLHeadingElement);
const subtitle = find(".gallery-inspector-head p", HTMLParagraphElement);
const head = find(".gallery-inspector-head", HTMLDivElement);
const grip = find(".gallery-inspector-grip", HTMLButtonElement);
const icons = find(".gallery-icons", HTMLTemplateElement);
const propsPane = find(".gallery-props", HTMLDivElement);
const textarea = find(".gallery-source textarea", HTMLTextAreaElement);
const paint = find(".gallery-paint", HTMLDivElement);
const issueList = find(".gallery-issues", HTMLUListElement);
const clear = find(".gallery-clear", HTMLButtonElement);
const share = find(".gallery-link", HTMLButtonElement);
const sharingIssue = find(".gallery-sharing-issue", HTMLParagraphElement);
const data: {
  cells: Record<string, Cell>;
  props: Record<string, Record<string, string[]>>;
} = JSON.parse(find("#gallery-data", HTMLScriptElement).text);

// A frame can't be told its scheme: prefers-color-scheme inside it follows the system, not the frame's color-scheme.
// So each frame's document gets one forced, as the playground's Theme pane does, with the scheme as a class on its
// root, and every prefers-color-scheme query in its styles turned to match. In Light or Dark, the page around the
// frames takes the scheme too.
const system = matchMedia("(prefers-color-scheme: dark)");
const queries = new WeakMap<CSSRule, string>();
function force(doc: Document, scheme?: string) {
  const root = doc.documentElement;
  root.classList.toggle("light", scheme === "light");
  root.classList.toggle("dark", scheme === "dark");
  root.style.colorScheme = scheme ?? "";
  const swap = scheme && scheme !== (system.matches ? "dark" : "light");
  // A frame's rules belong to its own window, so they're read by shape rather than by class.
  const walk = (rules: CSSRuleList) => {
    for (const rule of rules) {
      const media = (rule as Partial<CSSMediaRule>).media;
      if (media?.mediaText !== undefined) {
        if (!queries.has(rule)) queries.set(rule, media.mediaText);
        const text = queries.get(rule) ?? "";
        if (text.includes("prefers-color-scheme"))
          media.mediaText = swap
            ? text.replace(
                /(prefers-color-scheme:\s*)(dark|light)/g,
                (_, key: string, value: string) => key + (value === "dark" ? "light" : "dark"),
              )
            : text;
      }
      const children = (rule as Partial<CSSGroupingRule>).cssRules;
      if (children) walk(children);
    }
  };
  for (const sheet of doc.styleSheets) {
    try {
      walk(sheet.cssRules);
    } catch {
      // Another origin's sheet can't be read, and has no scheme queries of ours.
    }
  }
}

// A scroll to a cell glides, unless the reader asked for less motion.
const still = matchMedia("(prefers-reduced-motion: reduce)");
const glide = (): ScrollBehavior => (still.matches ? "instant" : "smooth");

// The canvas scrolls both ways and zooms with a pinch, Ctrl or ⌘ and the wheel, or the bar's buttons, around the point
// under the pointer. A transform scales the stage without laying it out again, so the sizer around it takes the scaled
// size, for the scrollbars.
let zoom = 1;
const size = () => {
  sizer.style.width = `${stage.offsetWidth * zoom}px`;
  sizer.style.height = `${stage.offsetHeight * zoom}px`;
};
new ResizeObserver(size).observe(stage);
function zoomTo(
  next: number,
  x = canvas.clientWidth / 2,
  y = canvas.clientHeight / 2,
  save = true,
) {
  const left = (canvas.scrollLeft + x) / zoom;
  const top = (canvas.scrollTop + y) / zoom;
  zoom = Math.min(2, Math.max(0.1, next));
  canvas.style.setProperty("--zoom", String(zoom));
  size();
  canvas.scrollLeft = left * zoom - x;
  canvas.scrollTop = top * zoom - y;
  level.textContent = `${Math.round(zoom * 100)}%`;
  if (save)
    try {
      localStorage.setItem("comark-gallery-zoom", String(zoom));
    } catch {
      // Private windows may refuse storage; the zoom still holds for this visit.
    }
}
const steps = [0.1, 0.25, 0.33, 0.5, 0.67, 0.8, 1, 1.25, 1.5, 2];
const zoomIn = () => zoomTo(steps.find((step) => step > zoom + 0.001) ?? 2);
const zoomOut = () => zoomTo(steps.findLast((step) => step < zoom - 0.001) ?? 0.1);
// A pinch reaches the page as a wheel with Ctrl held. Over a frame it reaches the frame's window, which hands it here.
function pinch(event: WheelEvent, x: number, y: number) {
  if (!event.ctrlKey && !event.metaKey) return;
  event.preventDefault();
  zoomTo(zoom * Math.exp(-event.deltaY * (event.deltaMode === 1 ? 0.05 : 0.0025)), x, y);
}
canvas.addEventListener(
  "wheel",
  (event) => {
    const box = canvas.getBoundingClientRect();
    pinch(event, event.clientX - box.left, event.clientY - box.top);
  },
  { passive: false },
);
// A drag between the frames pans. A finger pans as it scrolls anything.
let drag: { id: number; x: number; y: number; left: number; top: number } | undefined;
canvas.addEventListener("pointerdown", (event) => {
  if (event.button !== 0 || event.pointerType === "touch") return;
  if (event.target instanceof Element && event.target.closest(".gallery-frames, a, button, input"))
    return;
  event.preventDefault();
  drag = {
    id: event.pointerId,
    x: event.clientX,
    y: event.clientY,
    left: canvas.scrollLeft,
    top: canvas.scrollTop,
  };
  canvas.setPointerCapture(event.pointerId);
  canvas.dataset.dragging = "";
});
canvas.addEventListener("pointermove", (event) => {
  if (drag?.id !== event.pointerId) return;
  canvas.scrollLeft = drag.left - event.clientX + drag.x;
  canvas.scrollTop = drag.top - event.clientY + drag.y;
});
const release = (event: PointerEvent) => {
  if (drag?.id !== event.pointerId) return;
  drag = undefined;
  delete canvas.dataset.dragging;
};
canvas.addEventListener("pointerup", release);
canvas.addEventListener("pointercancel", release);

// Frames around a linked example grow as they load and push it away, so it's held in view until the reader moves.
let held: Element | null | undefined;
const hold = () => {
  held = location.hash
    ? gallery.querySelector(
        `.gallery-item#${CSS.escape(decodeURIComponent(location.hash.slice(1)))}`,
      )
    : undefined;
};
const keep = () => held?.scrollIntoView({ behavior: "instant" });
hold();
addEventListener("hashchange", hold);
for (const type of ["wheel", "touchmove", "keydown", "pointerdown"])
  addEventListener(type, () => (held = undefined), { passive: true });
let start = 1;
try {
  start = Number(localStorage.getItem("comark-gallery-zoom")) || 1;
} catch {
  // As above.
}
zoomTo(start, 0, 0, false);
keep();

// Each load is a new document: it takes its scheme, opens its links outside the frame, and keeps the frame its height.
function ready(frame: HTMLIFrameElement) {
  const doc = frame.contentDocument;
  const view = frame.contentWindow as (Window & typeof globalThis) | null;
  if (!doc?.body || !view || doc.URL === "about:blank") return;
  force(doc, frame.dataset.scheme);
  for (const link of doc.querySelectorAll<HTMLAnchorElement>("a[href]:not([href^='#'])"))
    link.target = "_blank";
  view.addEventListener(
    "wheel",
    (event) => {
      const box = frame.getBoundingClientRect();
      const outer = canvas.getBoundingClientRect();
      pinch(
        event,
        box.left - outer.left + event.clientX * zoom,
        box.top - outer.top + event.clientY * zoom,
      );
    },
    { passive: false },
  );
  const body = doc.body;
  new view.ResizeObserver(() => {
    frame.style.height = `${Math.ceil(body.getBoundingClientRect().height)}px`;
    keep();
  }).observe(body);
  frame.dataset.ready = "";
}
function watch(frame: HTMLIFrameElement) {
  frame.addEventListener("load", () => ready(frame));
  if (frame.contentDocument?.readyState === "complete") ready(frame);
}
for (const frame of gallery.querySelectorAll<HTMLIFrameElement>(".gallery-frame")) watch(frame);

// Light, Dark, or both side by side. A `scheme` in the URL wins over the saved one, for screenshots.
const schemes = ["light", "dark", "both"];
function show(scheme: string, save = false) {
  gallery.dataset.scheme = scheme;
  for (const button of document.querySelectorAll<HTMLButtonElement>(
    ".gallery-scheme [data-scheme]",
  ))
    button.setAttribute("aria-pressed", String(button.dataset.scheme === scheme));
  force(document, scheme === "both" ? undefined : scheme);
  if (save)
    try {
      localStorage.setItem("comark-gallery-scheme", scheme);
    } catch {
      // Private windows may refuse storage; the choice still holds for this visit.
    }
}
const asked = new URLSearchParams(location.search).get("scheme");
let saved: string | null = null;
try {
  saved = localStorage.getItem("comark-gallery-scheme");
} catch {
  // As above.
}
show([asked, saved].find((scheme) => scheme && schemes.includes(scheme)) ?? "light");
find(".gallery-scheme", HTMLDivElement).addEventListener("click", (event) => {
  const button = event.target instanceof Element ? event.target.closest("button") : null;
  if (!button?.dataset.scheme) return;
  show(button.dataset.scheme, true);
  // A link's scheme gives way to the reader's choice.
  const url = new URL(location.href);
  url.searchParams.delete("scheme");
  history.replaceState(history.state, "", url);
});
system.addEventListener("change", () => {
  show(gallery.dataset.scheme ?? "light");
  for (const frame of gallery.querySelectorAll<HTMLIFrameElement>(".gallery-frame[data-ready]"))
    if (frame.contentDocument) force(frame.contentDocument, frame.dataset.scheme);
});

// The filter keeps the examples whose package or name holds every word typed. The sidebar and the menu each have one.
const filters = [...document.querySelectorAll<HTMLInputElement>(".gallery-filter input")];
function filter(value: string) {
  const words = value.toLowerCase().split(/\s+/).filter(Boolean);
  const items = [...gallery.querySelectorAll<HTMLElement>(".gallery-item")];
  for (const item of items)
    item.hidden = !words.every((word) => (item.dataset.name ?? "").includes(word));
  for (const group of gallery.querySelectorAll<HTMLElement>(".gallery-group"))
    group.hidden = !group.querySelector(".gallery-item:not([hidden])");
  for (const link of document.querySelectorAll<HTMLElement>(".pages [data-gallery]"))
    link.hidden = document.getElementById(link.dataset.gallery ?? "")?.hidden ?? false;
  for (const heading of document.querySelectorAll<HTMLElement>(".pages [data-gallery-group]"))
    heading.hidden =
      gallery.querySelector<HTMLElement>(
        `.gallery-group[data-group="${heading.dataset.galleryGroup}"]`,
      )?.hidden ?? false;
  find(".gallery-empty", HTMLParagraphElement).hidden = items.some((item) => !item.hidden);
}
for (const input of filters)
  input.addEventListener("input", () => {
    for (const other of filters) if (other !== input) other.value = input.value;
    filter(input.value);
  });

// The index marks the first example in the top half of the canvas.
const inView = new Set<Element>();
const spy = new IntersectionObserver(
  (entries) => {
    for (const entry of entries)
      if (entry.isIntersecting) inView.add(entry.target);
      else inView.delete(entry.target);
    const first = [...gallery.querySelectorAll(".gallery-item")].find((item) => inView.has(item));
    for (const link of document.querySelectorAll<HTMLElement>(".pages [data-gallery]"))
      if (link.dataset.gallery === first?.id) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
  },
  { root: canvas, rootMargin: "0px 0px -50% 0px" },
);
for (const item of gallery.querySelectorAll(".gallery-item")) spy.observe(item);

// The components in a cell's Markdown, with each one's props and where they sit, so a control rewrites only its own
// prop and leaves the rest of the text as written. Code is blanked first, so a fence's text isn't read as components.
interface Prop {
  name: string;
  value?: string;
  start: number;
  end: number;
}
interface Component {
  name: string;
  block: boolean;
  /** The `{…}`, or where one goes. */
  braces?: { start: number; end: number };
  insert: number;
  props: Prop[];
}
const blank = (text: string) => text.replace(/[^\n]/g, " ");
function components(source: string): Component[] {
  const text = source
    .replace(/^([ \t]*)(`{3,}|~{3,})[^\n]*\n[\s\S]*?^[ \t]*\2[`~]*[ \t]*$/gm, blank)
    .replace(/`[^`\n]*`/g, blank);
  const found: Component[] = [];
  const read = (match: RegExpExecArray, block: boolean) => {
    const [whole, , name = "", , braces] = match;
    const end = match.index + whole.length;
    const component: Component = { name, block, insert: end, props: [] };
    if (braces) {
      const start = end - braces.length;
      component.braces = { start, end };
      for (const prop of braces
        .slice(1, -1)
        .matchAll(/([.#][\w-]+)|(:?[\w-]+)(?:=("[^"]*"|'[^']*'|[^\s}]+))?/g)) {
        if (prop[1] || !prop[2]) continue;
        const raw = prop[3];
        component.props.push({
          name: prop[2],
          value: raw && /^["']/.test(raw) ? raw.slice(1, -1) : raw,
          start: start + 1 + prop.index,
          end: start + 1 + prop.index + prop[0].length,
        });
      }
    }
    found.push(component);
  };
  for (const match of text.matchAll(
    /^[ \t]*(:{2,})([A-Za-z][\w-]*)(\[[^\]\n]*\])?(\{[^}\n]*\})?/gm,
  ))
    read(match, true);
  for (const match of text.matchAll(
    /(?<![\w:])(:)([A-Za-z][\w-]*)(?=[[{])(\[[^\]\n]*\])?(\{[^}\n]*\})?/g,
  ))
    read(match, false);
  return found.sort((a, b) => a.insert - b.insert);
}

const quote = (value: string) => (value.includes('"') ? `'${value}'` : `"${value}"`);
/** The Markdown with one prop set to a value, set bare (`true`), or removed (`null`). */
function setProp(source: string, component: Component, name: string, value: string | true | null) {
  const text = value === true ? name : `${name}=${quote(value ?? "")}`;
  const prop = component.props.find((prop) => prop.name === name);
  if (prop) {
    if (value !== null) return source.slice(0, prop.start) + text + source.slice(prop.end);
    const before = source[prop.start - 1] === " " ? 1 : 0;
    const after = !before && source[prop.end] === " " ? 1 : 0;
    const removed = source.slice(0, prop.start - before) + source.slice(prop.end + after);
    // Braces left with nothing in them go too.
    const open = component.braces?.start ?? -1;
    const close = removed.indexOf("}", open);
    return open >= 0 && !removed.slice(open + 1, close).trim()
      ? removed.slice(0, open) + removed.slice(close + 1)
      : removed;
  }
  if (value === null) return source;
  if (!component.braces)
    return `${source.slice(0, component.insert)}{${text}}${source.slice(component.insert)}`;
  const close = component.braces.end - 1;
  const spaced = close > component.braces.start + 1 && !/\s/.test(source[close - 1]!) ? " " : "";
  return source.slice(0, close) + spaced + text + source.slice(close);
}

// The package a component belongs to: the one whose examples use it most. Its props offer that package's values, so a
// screenshot in a recipe offers annotate's.
const owners = new Map<string, string>();
{
  const counts = new Map<string, Map<string, number>>();
  for (const cell of Object.values(data.cells))
    for (const { name } of components(cell.source)) {
      const byGroup = counts.get(name) ?? new Map<string, number>();
      byGroup.set(cell.group, (byGroup.get(cell.group) ?? 0) + 1);
      counts.set(name, byGroup);
    }
  for (const [name, byGroup] of counts)
    owners.set(name, [...byGroup].sort((a, b) => b[1] - a[1])[0]![0]);
}
const propsFor = (component: string, group: string) =>
  data.props[owners.get(component) ?? group] ?? data.props[group] ?? {};

// The cells: each example the page drew, and the copies added after one. A cell's Markdown is its example's until
// it's edited; a copy's id is its example's with `--` and a number, which no example id holds, since they are slugs.
const sources = new Map(Object.entries(data.cells).map(([id, cell]) => [id, cell.source]));
const added: Added[] = [];
const rootOf = (id: string) => id.split("--")[0] ?? id;
const cellOf = (id: string) => data.cells[rootOf(id)];
const article = (id: string) => document.getElementById(id);
let selected: string | undefined;

// A shared link carries the changes in the URL, deflated, as the playground's does.
const sharingUnsupported = "Sharing is unavailable in this browser (raw deflate is not supported).";
function compressionStream(kind: "compress" | "decompress") {
  const Stream =
    kind === "compress" ? globalThis.CompressionStream : globalThis.DecompressionStream;
  try {
    return new Stream("deflate-raw");
  } catch {
    throw new Error(sharingUnsupported);
  }
}
function reportSharing(error: unknown, message = "Could not create a sharing link.") {
  sharingIssue.textContent = `${message} ${error instanceof Error ? error.message : String(error)}`;
  sharingIssue.hidden = false;
}
async function pack(text: string) {
  const stream = new Blob([text]).stream().pipeThrough(compressionStream("compress"));
  const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}
async function unpack(code: string) {
  const binary = atob(code.replaceAll("-", "+").replaceAll("_", "/"));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  const stream = new Blob([bytes]).stream().pipeThrough(compressionStream("decompress"));
  return new Response(stream).text();
}

let saving: ReturnType<typeof setTimeout> | undefined;
let saveVersion = 0;
function savedState() {
  const edits = Object.fromEntries(
    [...sources].filter(([id, source]) => data.cells[id] && data.cells[id].source !== source),
  );
  return Object.keys(edits).length || added.length
    ? {
        edits,
        added: added.map((cell) => ({ ...cell, source: sources.get(cell.id) ?? cell.source })),
      }
    : undefined;
}
async function saveNow(): Promise<string> {
  clearTimeout(saving);
  const version = saveVersion;
  const state = savedState();
  const code = state ? await pack(JSON.stringify(state)) : undefined;
  // Compression can finish after another edit or reset. Only the current snapshot may reach the URL.
  if (version !== saveVersion) return saveNow();
  const url = new URL(location.href);
  if (code) url.searchParams.set("edit", code);
  else url.searchParams.delete("edit");
  history.replaceState(history.state, "", url);
  return url.href;
}
function save() {
  saveVersion++;
  clear.hidden = share.hidden = !savedState();
  clearTimeout(saving);
  saving = setTimeout(() => void saveNow().catch((error) => reportSharing(error)), 250);
}

// A cell's Playground link, and the inspector's while it's open, take the cell's Markdown as it is now.
async function link(id: string): Promise<string> {
  const source = sources.get(id) ?? "";
  const href = `/play/#md=${await pack(source)}`;
  if (source !== (sources.get(id) ?? "")) return link(id);
  const own = article(id)?.querySelector<HTMLAnchorElement>('[data-action="play"]');
  if (own) own.href = href;
  if (id === selected)
    find('.gallery-inspector [data-action="play"]', HTMLAnchorElement).href = href;
  return href;
}

// The plugins load with the first change. A slower render of older Markdown must not replace a newer one.
let renderer: Promise<typeof import("./gallery-render.ts")> | undefined;
const runs = new Map<string, number>();
const issuesOf = new Map<string, string[]>();
// The gallery is busy while a cell waits to render, so a screenshot or a test can wait for it.
const pending = new Set<string>();
const settle = (id: string) => {
  pending.delete(id);
  gallery.toggleAttribute("data-busy", pending.size > 0);
};
async function render(id: string) {
  const run = (runs.get(id) ?? 0) + 1;
  runs.set(id, run);
  const cell = cellOf(id);
  const node = article(id);
  if (!cell || !node) return settle(id);
  renderer ??= import("./gallery-render.ts");
  const { html, issues } = await (await renderer).render(sources.get(id) ?? "", cell.group);
  if (runs.get(id) !== run) return;
  settle(id);
  issuesOf.set(id, issues);
  const heading = node.querySelector("h3");
  if (heading) {
    if (issues.length) heading.dataset.issues = String(issues.length);
    else delete heading.dataset.issues;
  }
  for (const frame of node.querySelectorAll<HTMLIFrameElement>(".gallery-frame")) {
    delete frame.dataset.ready;
    frame.srcdoc = cellDocument(html, frame.dataset.scheme);
  }
  if (id === selected) showIssues();
}
const timers = new Map<string, ReturnType<typeof setTimeout>>();
function change(id: string, source: string) {
  sources.set(id, source);
  pending.add(id);
  gallery.dataset.busy = "";
  clearTimeout(timers.get(id));
  timers.set(
    id,
    setTimeout(() => {
      void render(id);
      void link(id).catch((error) => reportSharing(error));
    }, 120),
  );
  save();
}

// A copy goes right after the cell it came from, with a frame per scheme and no page to load: it renders from its
// Markdown. Copies replay in the order they were made, so a link rebuilds the same grid.
let copies = 0;
function addCell(
  after: string,
  label: string,
  source: string,
  id = `${rootOf(after)}--${++copies}`,
) {
  const from = article(after);
  if (!from) return;
  const node = from.cloneNode(true) as HTMLElement;
  node.id = id;
  node.dataset.cell = id;
  node.dataset.added = "";
  node.dataset.name = `${from.dataset.name ?? ""} ${label}`.toLowerCase();
  delete node.dataset.selected;
  const heading = node.querySelector("h3");
  delete heading?.dataset.issues;
  const anchor = heading?.querySelector("a");
  if (anchor) {
    anchor.textContent = label;
    anchor.href = `#${id}`;
  }
  const remove = node.querySelector<HTMLElement>('[data-action="remove"]');
  if (remove) remove.hidden = false;
  for (const frame of node.querySelectorAll<HTMLIFrameElement>(".gallery-frame")) {
    frame.removeAttribute("src");
    frame.removeAttribute("srcdoc");
    frame.removeAttribute("style");
    delete frame.dataset.ready;
    frame.title = `${label}, ${frame.dataset.scheme}`;
    watch(frame);
  }
  from.after(node);
  spy.observe(node);
  added.push({ id, after, label, source });
  change(id, source);
  return id;
}

function removeCell(id: string) {
  const index = added.findIndex((cell) => cell.id === id);
  const cell = added[index];
  if (!cell) return;
  added.splice(index, 1);
  // A copy made after this one now follows what this one followed.
  for (const other of added) if (other.after === id) other.after = cell.after;
  sources.delete(id);
  clearTimeout(timers.get(id));
  settle(id);
  article(id)?.remove();
  if (selected === id) close();
  save();
}

function resetCell(id: string) {
  const cell = data.cells[id];
  const node = article(id);
  if (!cell || !node) return;
  sources.set(id, cell.source);
  runs.set(id, (runs.get(id) ?? 0) + 1);
  clearTimeout(timers.get(id));
  settle(id);
  issuesOf.delete(id);
  node.querySelector("h3")?.removeAttribute("data-issues");
  // Without its srcdoc, a frame loads the page the build rendered again.
  for (const frame of node.querySelectorAll<HTMLIFrameElement>(".gallery-frame")) {
    delete frame.dataset.ready;
    frame.removeAttribute("srcdoc");
  }
  save();
  void link(id).catch((error) => reportSharing(error));
  if (selected === id) open(id);
}

// The inspector is a window over the canvas: its title bar moves it, its edges and corner resize it, the corner takes
// the arrow keys too, and a button swaps it to the other side. It keeps where it was and its size. While it's open, the
// canvas scrolls a cell clear of it. On a narrow screen it's a sheet along the foot instead.
const narrow = matchMedia("(max-width: 60rem)");
const inset = 12;
interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}
let box: Box | undefined;
try {
  box = JSON.parse(localStorage.getItem("comark-gallery-inspector") ?? "null") ?? undefined;
} catch {
  // As above.
}
const docked = (right = true): Box => {
  const w = 288;
  return {
    x: right ? gallery.clientWidth - w - inset : inset,
    y: inset,
    w,
    h: Math.min(560, gallery.clientHeight - 2 * inset),
  };
};
function place(next: Box) {
  const width = gallery.clientWidth;
  const height = gallery.clientHeight;
  const w = Math.max(240, Math.min(next.w, width - 2 * inset));
  const h = Math.max(160, Math.min(next.h, height - 2 * inset));
  box = {
    x: Math.max(inset, Math.min(next.x, width - w - inset)),
    y: Math.max(inset, Math.min(next.y, height - h - inset)),
    w,
    h,
  };
  for (const [key, value] of Object.entries(box))
    inspector.style.setProperty(`--${key}`, `${value}px`);
  const left = box.x + box.w / 2 < width / 2;
  canvas.style.scrollPaddingLeft = left ? `${box.x + box.w + inset}px` : "";
  canvas.style.scrollPaddingRight = left ? "" : `${width - box.x + inset}px`;
}
const keepBox = () => {
  try {
    localStorage.setItem("comark-gallery-inspector", JSON.stringify(box));
  } catch {
    // As above.
  }
};
new ResizeObserver(() => {
  if (box && !inspector.hidden) place(box);
}).observe(gallery);

let gesture: { id: number; x: number; y: number; from: Box; edge: string } | undefined;
function grab(event: PointerEvent, edge: string, handle: Element) {
  if (event.button !== 0 || narrow.matches || !box) return;
  event.preventDefault();
  gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, from: box, edge };
  handle.setPointerCapture(event.pointerId);
  gallery.dataset.moving = "";
}
head.addEventListener("pointerdown", (event) => {
  if (!(event.target instanceof Element && event.target.closest("button, a")))
    grab(event, "move", head);
});
for (const edge of inspector.querySelectorAll<HTMLElement>("[data-edge]"))
  edge.addEventListener("pointerdown", (event) => grab(event, edge.dataset.edge ?? "", edge));
grip.addEventListener("pointerdown", (event) => grab(event, "corner", grip));
inspector.addEventListener("pointermove", (event) => {
  if (gesture?.id !== event.pointerId) return;
  const { from, edge } = gesture;
  const dx = event.clientX - gesture.x;
  const dy = event.clientY - gesture.y;
  if (edge === "move") return place({ ...from, x: from.x + dx, y: from.y + dy });
  // The left edge moves while the right one stays.
  const w = Math.max(240, from.w + (edge === "left" ? -dx : dx));
  place({
    x: edge === "left" ? from.x + from.w - w : from.x,
    y: from.y,
    w: edge === "bottom" ? from.w : w,
    h: edge === "left" || edge === "right" ? from.h : from.h + dy,
  });
});
const letGo = (event: PointerEvent) => {
  if (gesture?.id !== event.pointerId) return;
  gesture = undefined;
  delete gallery.dataset.moving;
  keepBox();
};
inspector.addEventListener("pointerup", letGo);
inspector.addEventListener("pointercancel", letGo);
grip.addEventListener("keydown", (event) => {
  const step = event.shiftKey ? 64 : 16;
  const change = {
    ArrowLeft: [-step, 0],
    ArrowRight: [step, 0],
    ArrowUp: [0, -step],
    ArrowDown: [0, step],
  }[event.key];
  if (!change || !box) return;
  event.preventDefault();
  place({ ...box, w: box.w + change[0]!, h: box.h + change[1]! });
  keepBox();
});
function swapSide() {
  if (!box) return;
  const left = box.x + box.w / 2 < gallery.clientWidth / 2;
  place({ ...box, x: left ? gallery.clientWidth - box.w - inset : inset });
  keepBox();
}

// The inspector: one row per prop of each component in the selected cell, a select where the package's docs list
// values and a text field elsewhere, then the Markdown itself. Spread adds a copy for each value of a prop.
let highlight: ((code: string, lang: "mdc" | "json") => string) | undefined;
function repaint() {
  const text = `${textarea.value}\n `;
  if (highlight) paint.innerHTML = highlight(text, "mdc");
  else paint.replaceChildren(Object.assign(document.createElement("pre"), { textContent: text }));
}

function showIssues() {
  const issues = (selected && issuesOf.get(selected)) || [];
  issueList.replaceChildren(
    ...issues.map((issue) => Object.assign(document.createElement("li"), { textContent: issue })),
  );
  issueList.hidden = !issues.length;
}

// A small element with its properties and children. The properties go unchecked: a typed partial of every element
// type is a union TypeScript can't hold.
const element = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  properties: object = {},
  ...children: (Node | string)[]
): HTMLElementTagNameMap[K] => {
  const node = document.createElement(tag);
  Object.assign(node, properties);
  node.append(...children);
  return node;
};

const icon = (name: string) =>
  icons.content.querySelector(`[data-icon="${name}"]`)?.firstElementChild?.cloneNode(true) ?? "";

// Rows rebuild when the components or their props change; while a control is edited, only the Markdown changes, so
// the control keeps its focus.
let shape = "";
function rows(rebuild = false) {
  if (!selected) return;
  const id = selected;
  const group = cellOf(id)?.group ?? "";
  const found = components(sources.get(id) ?? "");
  const next = found
    .map((component) => `${component.name}:${component.props.map((prop) => prop.name).join(",")}`)
    .join(";");
  if (!rebuild && next === shape) return;
  shape = next;
  const seen = new Map<string, number>();
  propsPane.replaceChildren(
    ...found.map((component, index) => {
      const count = (seen.get(component.name) ?? 0) + 1;
      seen.set(component.name, count);
      const known = propsFor(component.name, group);
      const edit = (name: string, value: string | true | null) => {
        const current = components(sources.get(id) ?? "")[index];
        if (!current) return;
        const source = setProp(sources.get(id) ?? "", current, name, value);
        textarea.value = source;
        repaint();
        change(id, source);
        rows();
      };
      const fields = component.props.map((prop) => {
        const values = known[prop.name] ?? [];
        // A bare prop, like `open`, has no value; its select offers "(on)" for it.
        const current = prop.value ?? "";
        const choices = [
          ...new Set([...(prop.value === undefined ? [""] : []), ...values, current]),
        ];
        const field: HTMLSelectElement | HTMLInputElement = values.length
          ? element(
              "select",
              {},
              ...choices.map((value) =>
                element("option", { value, selected: value === current }, value || "(on)"),
              ),
            )
          : element("input", { value: current, placeholder: "on", spellcheck: false });
        field.setAttribute("aria-label", `${component.name} ${prop.name}`);
        field.addEventListener("input", () =>
          edit(prop.name, field.value === "" ? true : field.value),
        );
        const spread = element(
          "button",
          { type: "button", title: `Add a copy for each value of ${prop.name}` },
          icon("spread"),
        );
        spread.setAttribute("aria-label", `Spread ${prop.name} into copies`);
        spread.setAttribute("aria-expanded", "false");
        const remove = element(
          "button",
          { type: "button", title: `Remove ${prop.name}` },
          icon("remove"),
        );
        remove.setAttribute("aria-label", `Remove ${prop.name}`);
        remove.addEventListener("click", () => edit(prop.name, null));
        const row = element(
          "div",
          { className: "gallery-prop" },
          element("span", { className: "mono", title: prop.name }, prop.name),
          field,
          element("span", { className: "gallery-prop-actions" }, spread, remove),
        );
        // A copy for each checked value. The documented values start checked; the field adds any other.
        spread.addEventListener("click", () => {
          const fold = (form: Element) => {
            form.remove();
            spread.setAttribute("aria-expanded", "false");
          };
          if (row.nextElementSibling instanceof HTMLFormElement)
            return fold(row.nextElementSibling);
          spread.setAttribute("aria-expanded", "true");
          const chip = (value: string) =>
            element(
              "label",
              { className: "gallery-chip" },
              element("input", { type: "checkbox", value, checked: true }),
              element("span", { className: "gallery-chip-on" }, icon("on")),
              element("span", { className: "gallery-chip-off" }, icon("off")),
              value,
            );
          const other = element("input", { className: "gallery-spread-other", spellcheck: false });
          other.setAttribute("aria-label", `Add a value of ${prop.name}`);
          const pool = element(
            "div",
            { className: "gallery-spread-values" },
            ...values.filter((value) => value !== field.value).map(chip),
            other,
          );
          pool.setAttribute("role", "group");
          pool.setAttribute("aria-label", `Values of ${prop.name}`);
          const boxes = () => [...pool.querySelectorAll<HTMLInputElement>("[type=checkbox]")];
          const submit = element("button", { type: "submit", className: "button primary" });
          const all = element("button", { type: "button", className: "gallery-spread-all" });
          const count = () => {
            const checked = boxes().filter((box) => box.checked).length;
            submit.textContent = checked
              ? `Add ${checked} ${checked === 1 ? "copy" : "copies"}`
              : "Add copies";
            all.textContent = checked === boxes().length ? "Select none" : "Select all";
            all.hidden = boxes().length < 2;
            other.placeholder = boxes().length ? "Other" : "A value, then Enter";
          };
          // A typed value becomes a chip on Enter or a comma, or checks the chip it names.
          const take = () => {
            for (const value of other.value
              .split(",")
              .map((value) => value.trim())
              .filter(Boolean)) {
              const box = boxes().find((box) => box.value === value);
              if (box) box.checked = true;
              else other.before(chip(value));
            }
            other.value = "";
            count();
          };
          other.addEventListener("input", () => {
            if (other.value.includes(",")) take();
          });
          other.addEventListener("keydown", (event) => {
            if (event.key !== "Enter" || !other.value.trim()) return;
            event.preventDefault();
            take();
          });
          pool.addEventListener("change", count);
          all.addEventListener("click", () => {
            const check = boxes().some((box) => !box.checked);
            for (const box of boxes()) box.checked = check;
            count();
          });
          count();
          const form = element(
            "form",
            { className: "gallery-spread" },
            pool,
            element("div", { className: "gallery-spread-foot" }, submit, all),
          );
          form.addEventListener("keydown", (event) => {
            if (event.key !== "Escape") return;
            event.stopPropagation();
            fold(form);
            spread.focus();
          });
          form.addEventListener("submit", (event) => {
            event.preventDefault();
            take();
            const picked = boxes()
              .filter((box) => box.checked)
              .map((box) => box.value);
            if (!picked.length) return other.focus();
            const label = title.textContent ?? "";
            let after = id;
            for (const value of picked) {
              const current = components(sources.get(id) ?? "")[index];
              if (!current) break;
              const copy = addCell(
                after,
                `${label} · ${prop.name}=${value}`,
                setProp(sources.get(id) ?? "", current, prop.name, value),
              );
              if (copy) after = copy;
            }
            article(after)?.scrollIntoView({
              block: "nearest",
              inline: "nearest",
              behavior: glide(),
            });
            fold(form);
            spread.focus();
          });
          row.after(form);
          (values.length ? submit : other).focus();
        });
        return row;
      });
      const missing = Object.keys(known).filter(
        (name) => !component.props.some((prop) => prop.name === name),
      );
      const add = element("input", { placeholder: "Add a prop", spellcheck: false });
      add.setAttribute("aria-label", `Add a prop to ${component.name}`);
      const list = element(
        "datalist",
        { id: `gallery-props-${index}` },
        ...missing.map((name) => element("option", { value: name })),
      );
      add.setAttribute("list", list.id);
      add.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" || !/^[\w-]+$/.test(add.value)) return;
        event.preventDefault();
        edit(add.value, true);
      });
      return element(
        "section",
        {},
        element(
          "h3",
          { className: "mono" },
          `${component.block ? "::" : ":"}${component.name}${count > 1 ? ` ${count}` : ""}`,
        ),
        ...fields,
        element("div", { className: "gallery-prop gallery-prop-add" }, add, list),
      );
    }),
  );
}

function open(id: string) {
  const cell = cellOf(id);
  const node = article(id);
  if (!cell || !node) return;
  for (const other of gallery.querySelectorAll("[data-selected]"))
    other.removeAttribute("data-selected");
  node.dataset.selected = "";
  selected = id;
  title.textContent = node.querySelector("h3 a")?.textContent ?? cell.label;
  subtitle.textContent =
    node.closest(".gallery-group")?.querySelector("h2 small")?.textContent ?? cell.group;
  textarea.value = sources.get(id) ?? "";
  repaint();
  rows(true);
  showIssues();
  const isAdded = node.dataset.added !== undefined;
  find('.gallery-inspector [data-action="reset"]', HTMLButtonElement).hidden =
    isAdded || data.cells[id]?.source === sources.get(id);
  find('.gallery-inspector [data-action="remove"]', HTMLButtonElement).hidden = !isAdded;
  const opening = inspector.hidden;
  inspector.hidden = false;
  gallery.dataset.inspecting = "";
  place(box ?? docked());
  node.scrollIntoView({ block: "nearest", inline: "nearest", behavior: glide() });
  if (opening) inspector.focus({ preventScroll: true });
  void import("./highlight.ts").then((module) => {
    highlight = module.highlight;
    repaint();
  });
  void link(id).catch((error) => reportSharing(error));
}
function close() {
  for (const other of gallery.querySelectorAll("[data-selected]"))
    other.removeAttribute("data-selected");
  const was = selected ? article(selected) : null;
  selected = undefined;
  // Focus goes back to the cell it came from, unless the reader has moved on.
  if (inspector.contains(document.activeElement))
    was?.querySelector<HTMLElement>('[data-action="edit"]')?.focus({ preventScroll: true });
  inspector.hidden = true;
  delete gallery.dataset.inspecting;
  canvas.style.scrollPaddingLeft = canvas.style.scrollPaddingRight = "";
}

textarea.addEventListener("input", () => {
  if (!selected) return;
  repaint();
  change(selected, textarea.value);
  find('.gallery-inspector [data-action="reset"]', HTMLButtonElement).hidden =
    !data.cells[selected] || data.cells[selected].source === textarea.value;
  rows();
});

function duplicate(id: string) {
  const node = article(id);
  const label = node?.querySelector("h3 a")?.textContent ?? cellOf(id)?.label ?? "";
  const copy = addCell(id, `${label} (copy)`, sources.get(id) ?? "");
  if (copy) open(copy);
}

function act(event: MouseEvent) {
  const target =
    event.target instanceof Element ? event.target.closest<HTMLElement>("[data-action]") : null;
  const action = target?.dataset.action;
  if (
    !target ||
    !action ||
    (event.type === "auxclick" && (event.button !== 1 || action !== "play"))
  )
    return;
  if (action === "zoom-in") return zoomIn();
  if (action === "zoom-out") return zoomOut();
  if (action === "zoom-reset") return zoomTo(1);
  const id = inspector.contains(target)
    ? selected
    : target.closest<HTMLElement>(".gallery-item")?.id;
  if (action === "close") return close();
  if (action === "side") return swapSide();
  if (!id) return;
  if (action === "play") {
    event.preventDefault();
    const newTab = event.button === 1 || event.ctrlKey || event.metaKey || event.shiftKey;
    // Open during the gesture so a modified click keeps the browser's new-tab behavior.
    const tab = newTab ? window.open("about:blank", "_blank") : null;
    if (tab) tab.opener = null;
    void link(id)
      .then((href) => {
        if (newTab) tab?.location.replace(new URL(href, location.href).href);
        else location.assign(href);
      })
      .catch((error) => {
        tab?.close();
        reportSharing(error, "Could not open the playground.");
      });
    return;
  }
  if (action === "edit") return id === selected ? close() : open(id);
  if (action === "duplicate") return duplicate(id);
  if (action === "remove") return removeCell(id);
  if (action === "reset") return resetCell(id);
  if (action === "copy") void navigator.clipboard.writeText(sources.get(id) ?? "");
}
document.addEventListener("click", act);
document.addEventListener("auxclick", act);
addEventListener("keydown", (event) => {
  if (event.key === "Escape" && selected && !(event.target instanceof HTMLTextAreaElement)) close();
});

clear.addEventListener("click", () => {
  for (const id of added.map((cell) => cell.id)) removeCell(id);
  for (const id of Object.keys(data.cells))
    if (sources.get(id) !== data.cells[id]?.source) resetCell(id);
  close();
});
share.addEventListener("click", () => {
  void saveNow()
    .then((href) => navigator.clipboard.writeText(href))
    .catch((error) => reportSharing(error, "Could not copy the gallery link."));
});

// A link's changes render as the page opens.
const edit = new URLSearchParams(location.search).get("edit");
if (edit) {
  pending.add("");
  gallery.dataset.busy = "";
  void unpack(edit)
    .then((text) => {
      const saved: { edits?: Record<string, string>; added?: Added[] } = JSON.parse(text);
      for (const [id, source] of Object.entries(saved.edits ?? {}))
        if (data.cells[id]) change(id, source);
      for (const cell of saved.added ?? []) {
        const number = Number(cell.id.split("--")[1]);
        if (Number.isFinite(number)) copies = Math.max(copies, number);
        addCell(cell.after, cell.label, cell.source, cell.id);
      }
      hold();
      keep();
    })
    .catch((error) => reportSharing(error, "Could not load the edits from this link."))
    .finally(() => settle(""));
}
