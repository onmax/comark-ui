import { css } from "./styles.ts";

declare global {
  interface Window {
    __comarkCharts?: { users: number; stop: () => void };
  }
}

const icon = (body: string) =>
  `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
// Lucide's copy, check, chevron-down, image, and table (ISC); the Markdown mark is drawn on the same grid.
const copyIcon = icon(
  '<rect x="8" y="8" width="14" height="14" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
);
const doneIcon = icon('<path d="M20 6 9 17l-5-5"/>');
const formats = [
  [
    "image",
    "Image",
    "PNG, for pull requests and chat",
    '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/>',
  ],
  [
    "table",
    "Table",
    "The data, as cells in a spreadsheet",
    '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/>',
  ],
  [
    "markdown",
    "Markdown",
    "The data, as a table for GitHub",
    '<path d="M4 7v10M4 7l4 5 4-5v10M17 7v10M14 14l3 3 3-3"/>',
  ],
] as const;

/**
 * The bar of a chart: its Copy button, a menu of the other formats, and a status line for screen readers. Copy takes the image, or
 * the data when `image` is false: a chart with marks, which a copy of its SVG would leave out. Every renderer inlines
 * this string.
 */
export function bar(image = true): string {
  const shown = image ? formats : formats.slice(1);
  const items = shown
    .map(
      ([format, name, hint, path]) =>
        `<button type="button" role="menuitem" tabindex="-1" data-chart-copy="${format}">${icon(path)}<span><b>${name}</b><small>${hint}</small></span></button>`,
    )
    .join("");
  const label = image ? "Copy the chart as an image" : "Copy the chart's data";
  return (
    `<span class="cch-status" role="status"></span><div class="cch-copy">` +
    `<button type="button" class="cch-copy-main" data-chart-copy="${image ? "image" : "table"}" aria-label="${label}" title="${label}">${copyIcon}${doneIcon}</button>` +
    `<button type="button" class="cch-copy-more" aria-label="More ways to copy" title="More ways to copy" aria-haspopup="menu" aria-expanded="false">${icon('<path d="m6 9 6 6 6-6"/>')}</button>` +
    `<div class="cch-menu" role="menu" aria-label="Copy as" hidden>${items}</div></div>`
  );
}

/**
 * Starts the Copy button and menu of every `.cch` chart on the page, adding `css` unless the page has it, and returns a
 * function that stops them. Every caller shares one set of listeners, which stop with the last caller. The function is
 * self-contained: the HTML renderer inlines its source as a script, so it must not use anything from outside its body.
 */
export function start(css: string): () => void {
  const running = window.__comarkCharts;
  if (running) {
    running.users++;
    return running.stop;
  }
  const listeners = new AbortController();
  if (css && !document.querySelector("style[data-comark-charts]")) {
    const style = document.createElement("style");
    style.setAttribute("data-comark-charts", "");
    style.textContent = css;
    document.head.append(style);
  }
  document.documentElement.setAttribute("data-charts-ready", "");

  const cells = (table: HTMLTableElement) =>
    [...table.rows].map((row) => [...row.cells].map((cell) => (cell.textContent ?? "").trim()));
  const tsv = (rows: string[][]) =>
    rows.map((row) => row.map((cell) => cell.replace(/[\t\n]+/g, " ")).join("\t")).join("\n");
  const markdown = ([header = [], ...body]: string[][]) =>
    [header, header.map(() => "---"), ...body]
      .map(
        (row) =>
          `| ${row.map((cell) => cell.replaceAll("|", "\\|").replaceAll("\n", " ")).join(" | ")} |`,
      )
      .join("\n");
  const escape = (cell: string) =>
    cell.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  // Tags are built from their names, so this script's source, inlined in the page, holds no table markup of its own.
  const el = (tag: string, inner: string) => `<${tag}>${inner}</${tag}>`;
  const tr = (line: string[], tag: string) =>
    el("tr", line.map((cell) => el(tag, escape(cell))).join(""));
  const html = ([header = [], ...body]: string[][]) =>
    el(
      "table",
      el("thead", tr(header, "th")) + el("tbody", body.map((line) => tr(line, "td")).join("")),
    );

  // The page's rules swap Flint's inks for the theme's colors and fonts, and an SVG drawn as an image sees none of
  // them, so every element of the copy takes the paint it shows on the page. Drawn at twice its size or the screen's.
  const PAINT = ["fill", "stroke", "stroke-width", "opacity", "fill-opacity", "stroke-opacity"];
  const TEXT = ["font-family", "font-size", "font-weight"];
  async function png(figure: Element): Promise<Blob> {
    const svg = figure.querySelector<SVGSVGElement>(".cch-plot>svg");
    if (!svg) throw new Error("no chart");
    const { width, height } = svg.getBoundingClientRect();
    const copy = svg.cloneNode(true);
    if (!(copy instanceof SVGSVGElement)) throw new Error("no chart");
    const from = [svg, ...svg.querySelectorAll("*")];
    const to = [copy, ...copy.querySelectorAll("*")];
    from.forEach((node, index) => {
      const into = to[index];
      if (!(into instanceof SVGElement)) return;
      const style = getComputedStyle(node);
      const props =
        node.localName === "text" || node.localName === "tspan" ? [...PAINT, ...TEXT] : PAINT;
      for (const prop of props) into.style.setProperty(prop, style.getPropertyValue(prop));
    });
    copy.setAttribute("width", String(width));
    copy.setAttribute("height", String(height));
    const image = new Image();
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(copy))}`;
    await image.decode();
    const pad = 16;
    const scale = Math.max(2, devicePixelRatio);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round((width + 2 * pad) * scale);
    canvas.height = Math.round((height + 2 * pad) * scale);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("no canvas");
    context.scale(scale, scale);
    context.fillStyle = getComputedStyle(figure).backgroundColor;
    context.fillRect(0, 0, width + 2 * pad, height + 2 * pad);
    context.drawImage(image, pad, pad, width, height);
    return new Promise((resolve, reject) =>
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("no image"))), "image/png"),
    );
  }

  const named = (format: string) =>
    format === "csv" ? "CSV" : format === "markdown" ? "Markdown" : format;
  function copy(figure: Element, format: string) {
    const status = figure.querySelector(".cch-status");
    const main = figure.querySelector(".cch-copy-main");
    const table = figure.querySelector<HTMLTableElement>(".cch-data table");
    if (!status) return;
    const say = (message: string, state: string) => {
      status.textContent = message;
      main?.setAttribute("data-state", state);
      setTimeout(() => {
        if (status.textContent !== message) return;
        status.textContent = "";
        main?.removeAttribute("data-state");
      }, 1500);
    };
    // SAFETY: `clipboard` is missing outside secure contexts, whatever the DOM types say.
    const clipboard = navigator.clipboard as Clipboard | undefined;
    const items = "ClipboardItem" in window;
    if (!clipboard || (format === "image" && !items) || (format !== "image" && !table))
      return say("Couldn't copy here", "failed");
    const rows = table ? cells(table) : [];
    // Safari only lets a click write what it hands over before awaiting, so the image goes up as a promise of one.
    // A table goes up as HTML too, which spreadsheets and editors paste as cells; the tab-separated text is for the
    // rest, and for browsers that can only write text.
    const written =
      format === "image"
        ? clipboard.write([new ClipboardItem({ "image/png": png(figure) })])
        : format === "table" && items
          ? clipboard.write([
              new ClipboardItem({
                "text/html": new Blob([html(rows)], { type: "text/html" }),
                "text/plain": new Blob([tsv(rows)], { type: "text/plain" }),
              }),
            ])
          : clipboard.writeText(format === "markdown" ? markdown(rows) : tsv(rows));
    written.then(
      () => say(`Copied as ${named(format)}`, "done"),
      () => say("Couldn't copy here", "failed"),
    );
  }

  // The menu of formats. It closes on a choice, Escape, Tab, or a click anywhere else, and arrows move through it.
  function close(more: HTMLElement, focus = false) {
    const menu = more.nextElementSibling;
    if (!(menu instanceof HTMLElement) || menu.hidden) return;
    menu.hidden = true;
    more.setAttribute("aria-expanded", "false");
    if (focus) more.focus();
  }
  function open(more: HTMLElement) {
    const menu = more.nextElementSibling;
    if (!(menu instanceof HTMLElement)) return;
    menu.hidden = false;
    more.setAttribute("aria-expanded", "true");
    menu.querySelector<HTMLElement>("[role=menuitem]")?.focus();
  }
  const closeAll = (except?: Element) => {
    for (const more of document.querySelectorAll<HTMLElement>(".cch-copy-more[aria-expanded=true]"))
      if (more !== except) close(more);
  };

  document.addEventListener(
    "click",
    (event) => {
      const target = event.target instanceof Element ? event.target : null;
      const more = target?.closest<HTMLElement>(".cch .cch-copy-more");
      closeAll(more ?? undefined);
      if (more) return more.getAttribute("aria-expanded") === "true" ? close(more) : open(more);
      const button = target?.closest<HTMLElement>(".cch [data-chart-copy]");
      const figure = button?.closest(".cch");
      if (!button || !figure) return;
      copy(figure, button.getAttribute("data-chart-copy") ?? "image");
      const owner = button.closest(".cch-menu")?.previousElementSibling;
      if (owner instanceof HTMLElement) owner.focus();
    },
    { signal: listeners.signal },
  );
  document.addEventListener(
    "keydown",
    (event) => {
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (target?.matches(".cch-copy-more") && event.key === "ArrowDown") {
        event.preventDefault();
        return open(target);
      }
      const menu = target?.closest<HTMLElement>(".cch-menu");
      const more = menu?.previousElementSibling;
      if (!target || !menu || !(more instanceof HTMLElement)) return;
      const items = [...menu.querySelectorAll<HTMLElement>("[role=menuitem]")];
      const at = items.indexOf(target);
      const { key } = event;
      const step =
        key === "ArrowDown"
          ? at + 1
          : key === "ArrowUp"
            ? at - 1
            : key === "Home"
              ? 0
              : key === "End"
                ? items.length - 1
                : undefined;
      if (step !== undefined) {
        event.preventDefault();
        items[(step + items.length) % items.length]?.focus();
      } else if (event.key === "Escape") {
        event.preventDefault();
        close(more, true);
      } else if (event.key === "Tab") close(more);
    },
    { signal: listeners.signal },
  );

  const handle = {
    users: 1,
    stop: () => {
      if (--handle.users > 0) return;
      listeners.abort();
      document.documentElement.removeAttribute("data-charts-ready");
      delete window.__comarkCharts;
    },
  };
  window.__comarkCharts = handle;
  return handle.stop;
}

export { css };
