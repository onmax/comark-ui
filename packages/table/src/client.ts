declare global {
  interface Window {
    __comarkTable?: { users: number; stop: () => void };
  }
}

const icon = (body: string) =>
  `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
// Lucide's copy, check, chevron-down, table, and file-text (ISC); the Markdown mark is drawn on the same grid.
const copyIcon = icon(
  '<rect x="8" y="8" width="14" height="14" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
);
const doneIcon = icon('<path d="M20 6 9 17l-5-5"/>');
const formats = [
  [
    "table",
    "Table",
    "Pastes as cells in a spreadsheet",
    '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/>',
  ],
  [
    "markdown",
    "Markdown",
    "A table that renders on GitHub",
    '<path d="M4 7v10M4 7l4 5 4-5v10M17 7v10M14 14l3 3 3-3"/>',
  ],
  [
    "csv",
    "CSV",
    "Comma-separated text",
    '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v5h6M16 13H8M16 17H8M10 9H8"/>',
  ],
] as const;

/**
 * The bar above a table: a status line for screen readers, then one Copy button for the table and a menu of the other
 * formats. Every renderer inlines this string.
 */
export function bar(): string {
  const items = formats
    .map(
      ([format, name, hint, path]) =>
        `<button type="button" role="menuitem" tabindex="-1" data-table-copy="${format}">${icon(path)}<span><b>${name}</b><small>${hint}</small></span></button>`,
    )
    .join("");
  return (
    `<span class="ctb-status" role="status"></span><div class="ctb-copy">` +
    `<button type="button" class="ctb-copy-main" data-table-copy="table" aria-label="Copy table" title="Copy table">${copyIcon}${doneIcon}</button>` +
    `<button type="button" class="ctb-copy-more" aria-label="More ways to copy" title="More ways to copy" aria-haspopup="menu" aria-expanded="false">${icon('<path d="m6 9 6 6 6-6"/>')}</button>` +
    `<div class="ctb-menu" role="menu" aria-label="Copy as" hidden>${items}</div></div>`
  );
}

/**
 * Starts the copy buttons and sortable headers of every `.ctb` table on the page and returns a function that stops
 * them. Every caller shares one set of listeners, which stop with the last caller. The function is self-contained: the
 * HTML renderer inlines its source as a script, so it must not use anything from outside its body.
 */
export function start(css: string): () => void {
  const running = window.__comarkTable;
  if (running) {
    running.users++;
    return running.stop;
  }
  const listeners = new AbortController();
  // The page may already carry the styles: the HTML renderer inlines them, and apps can import style.css.
  if (!document.querySelector("style[data-comark-table],link[data-comark-table]")) {
    const style = document.createElement("style");
    style.setAttribute("data-comark-table", "");
    style.textContent = css;
    document.head.append(style);
  }
  document.documentElement.setAttribute("data-table-ready", "");

  const cells = (table: HTMLTableElement) =>
    [...table.rows].map((row) => [...row.cells].map((cell) => (cell.textContent ?? "").trim()));
  const csv = (rows: string[][]) =>
    rows
      .map((row) =>
        row
          .map((cell) => (/[",\n]/.test(cell) ? `"${cell.replaceAll('"', '""')}"` : cell))
          .join(","),
      )
      .join("\n");
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
  const named = (format: string) =>
    format === "csv" ? "CSV" : format === "markdown" ? "Markdown" : format;

  function copy(root: Element, format: string) {
    const table = root.querySelector("table");
    const status = root.querySelector(".ctb-status");
    const main = root.querySelector(".ctb-copy-main");
    if (!table || !status) return;
    const rows = cells(table);
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
    if (!clipboard) return say("Couldn't copy here", "failed");
    const text = format === "csv" ? csv(rows) : format === "markdown" ? markdown(rows) : tsv(rows);
    // A table goes up as HTML too, which spreadsheets and editors paste as cells; the tab-separated text is for the
    // rest, and for browsers that can only write text.
    const written =
      format === "table" && "ClipboardItem" in window
        ? clipboard.write([
            new ClipboardItem({
              "text/html": new Blob([html(rows)], { type: "text/html" }),
              "text/plain": new Blob([text], { type: "text/plain" }),
            }),
          ])
        : clipboard.writeText(text);
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
    for (const more of document.querySelectorAll<HTMLElement>(".ctb-copy-more[aria-expanded=true]"))
      if (more !== except) close(more);
  };

  // Numbers sort as numbers, with their commas and units, and everything else as words, so "10" follows "9".
  const words = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
  const number = (cell: string) =>
    /^[+-]?(?:\d[\d,]*(?:\.\d+)?|\.\d+)/.test(cell)
      ? Number.parseFloat(cell.replaceAll(",", ""))
      : Number.NaN;
  function sort(header: HTMLTableCellElement) {
    const table = header.closest("table");
    const body = table?.tBodies[0];
    if (!table || !body) return;
    const ascending = header.getAttribute("aria-sort") !== "ascending";
    for (const other of table.querySelectorAll("th[aria-sort]")) other.removeAttribute("aria-sort");
    header.setAttribute("aria-sort", ascending ? "ascending" : "descending");
    const column = header.cellIndex;
    const value = (row: HTMLTableRowElement) => (row.cells[column]?.textContent ?? "").trim();
    const rows = [...body.rows].sort((a, b) => {
      const [left, right] = [value(a), value(b)];
      const [x, y] = [number(left), number(right)];
      const order = Number.isNaN(x) || Number.isNaN(y) ? words.compare(left, right) : x - y;
      return ascending ? order : -order;
    });
    body.append(...rows);
  }

  document.addEventListener(
    "click",
    (event) => {
      const target = event.target instanceof Element ? event.target : null;
      const more = target?.closest<HTMLElement>(".ctb>.ctb-bar .ctb-copy-more");
      closeAll(more ?? undefined);
      if (more) return more.getAttribute("aria-expanded") === "true" ? close(more) : open(more);
      const button = target?.closest<HTMLElement>(".ctb>.ctb-bar [data-table-copy]");
      const root = button?.closest(".ctb");
      if (button && root) {
        copy(root, button.getAttribute("data-table-copy") ?? "table");
        const owner = button.closest(".ctb-menu")?.previousElementSibling;
        if (owner instanceof HTMLElement) owner.focus();
        return;
      }
      const header = target?.closest(".ctb-sort")?.closest("th");
      if (header) sort(header);
    },
    { signal: listeners.signal },
  );
  document.addEventListener(
    "keydown",
    (event) => {
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (target?.matches(".ctb-copy-more") && event.key === "ArrowDown") {
        event.preventDefault();
        return open(target);
      }
      const menu = target?.closest<HTMLElement>(".ctb-menu");
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
      document.documentElement.removeAttribute("data-table-ready");
      delete window.__comarkTable;
    },
  };
  window.__comarkTable = handle;
  return handle.stop;
}

export { css } from "./styles.ts";
