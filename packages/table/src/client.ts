declare global {
  interface Window {
    __comarkTable?: { users: number; stop: () => void };
  }
}

const icon = (body: string) =>
  `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
// Lucide's copy (ISC).
const copyIcon = icon(
  '<rect x="8" y="8" width="14" height="14" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
);

/** The bar above a table: a status line for screen readers and the two copy buttons. Every renderer inlines this string. */
export function bar(): string {
  return (
    `<span class="ctb-status" role="status"></span>` +
    `<button type="button" data-table-copy="csv" aria-label="Copy as CSV" title="Copy as CSV">${copyIcon}CSV</button>` +
    `<button type="button" data-table-copy="markdown" aria-label="Copy as Markdown" title="Copy as Markdown">${copyIcon}Markdown</button>`
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
  const markdown = ([header = [], ...body]: string[][]) =>
    [header, header.map(() => "---"), ...body]
      .map(
        (row) =>
          `| ${row.map((cell) => cell.replaceAll("|", "\\|").replaceAll("\n", " ")).join(" | ")} |`,
      )
      .join("\n");

  function copy(root: Element, format: string) {
    const table = root.querySelector("table");
    const status = root.querySelector(".ctb-status");
    if (!table || !status) return;
    const rows = cells(table);
    const say = (message: string) => {
      status.textContent = message;
      setTimeout(() => {
        if (status.textContent === message) status.textContent = "";
      }, 1500);
    };
    // SAFETY: `clipboard` is missing outside secure contexts, whatever the DOM types say.
    const clipboard = navigator.clipboard as Clipboard | undefined;
    if (!clipboard) return say("Couldn't copy here");
    clipboard.writeText(format === "csv" ? csv(rows) : markdown(rows)).then(
      () => say(format === "csv" ? "Copied CSV" : "Copied Markdown"),
      () => say("Couldn't copy here"),
    );
  }

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
      const button = target?.closest<HTMLElement>(".ctb>.ctb-bar>button[data-table-copy]");
      const root = button?.closest(".ctb");
      if (button && root) return copy(root, button.getAttribute("data-table-copy") ?? "csv");
      const header = target?.closest(".ctb-sort")?.closest("th");
      if (header) sort(header);
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
