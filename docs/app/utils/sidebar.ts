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
  if (column && position?.list === column.getAttribute("aria-label"))
    column.scrollTop = position.top;
}

function entryOf() {
  // Vue Router's key is unique to the entry, unlike its numeric position, which can be reused after Back then push.
  // The URL fallback covers the initial document before the router has initialized its state.
  const state = history.state as { key?: string; position?: number } | null;
  if (state?.key) return `history:${state.key}`;
  // The initial entry may be mounted before Vue Router has installed its key. Give it one now so the
  // value captured on unmount is the same entry that a later Back navigation restores.
  const key = crypto.randomUUID();
  history.replaceState({ ...(state ?? {}), key }, "", location.href);
  return `history:${key}`;
}
