// Each page's body brings its own sidebar, so a navigation replaces the column the reader had scrolled. When the next
// page's column lists the same pages, it opens where the last one was left, and the link just clicked stays put.
let left: { list: string | null; top: number } | undefined;

const columnOf = (root: ParentNode) => root.querySelector<HTMLElement>(".sidebar .pages");

export function leaveSidebar(root: ParentNode) {
  const column = columnOf(root);
  left = column ? { list: column.getAttribute("aria-label"), top: column.scrollTop } : undefined;
}

export function enterSidebar(root: ParentNode) {
  const column = columnOf(root);
  if (column && left?.list === column.getAttribute("aria-label")) column.scrollTop = left.top;
}
