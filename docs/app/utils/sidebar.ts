// Each page's body brings its own sidebar, so a navigation replaces the column the reader had scrolled. Keep the
// position by history entry: a Back/Forward navigation must restore the entry being revisited, not the last page left.
const positions = new Map<string, { list: string | null; top: number }>();
let activeEntry: string | undefined;

const columnOf = (root: ParentNode) => root.querySelector<HTMLElement>(".sidebar .pages");

export function leaveSidebar(root: ParentNode) {
  const column = columnOf(root);
  if (!column) return;
  positions.set(activeEntry ?? entryOf(), {
    list: column.getAttribute("aria-label"),
    top: column.scrollTop,
  });
}

export function enterSidebar(root: ParentNode) {
  const column = columnOf(root);
  activeEntry = entryOf();
  const position = positions.get(activeEntry);
  if (column && position?.list === column.getAttribute("aria-label")) column.scrollTop = position.top;
}

function entryOf() {
  // Vue Router records a monotonic position for each browser history entry. The URL fallback covers the initial
  // document before the router has initialized its state.
  const position = (history.state as { position?: number } | null)?.position;
  return position === undefined ? location.href : `history:${position}`;
}
