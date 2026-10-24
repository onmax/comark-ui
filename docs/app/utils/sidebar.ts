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
  if (column && position?.list === column.getAttribute("aria-label")) {
    // The page body can arrive just after this component mounts. Restore once more on the
    // first frame so setting scrollTop is not clamped while the column is still empty.
    let frames = 0;
    const restore = () => {
      if (position.top > 0 && column.scrollHeight <= column.clientHeight && frames++ < 30) {
        requestAnimationFrame(restore);
        return;
      }
      column.scrollTop = position.top;
    };
    restore();
    requestAnimationFrame(restore);
  }
}

function entryOf() {
  // Keep our own identifier on every entry. Vue Router may replace its state while a navigation is in
  // flight, whereas this value remains attached to the exact browser entry being revisited.
  const state = history.state as { sidebarKey?: string } | null;
  if (state?.sidebarKey) return `sidebar:${state.sidebarKey}`;
  const key = crypto.randomUUID();
  history.replaceState({ ...(state ?? {}), sidebarKey: key }, "", location.href);
  return `sidebar:${key}`;
}
