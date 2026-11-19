// The switches and tab rows: one indicator per group sits under the pressed button or chosen tab, however it gets
// pressed. The motion layer that the docs shell and comark-motion run slides it there: the group opts in with
// `data-motion-select`, and the chosen item carries `data-state="active"`, since `aria-pressed` alone is a toggle.
export function indicate(group: HTMLElement, selector = "[aria-pressed=true]"): () => void {
  const bar = group.appendChild(
    Object.assign(document.createElement("span"), { className: "indicator" }),
  );
  bar.setAttribute("aria-hidden", "true");
  bar.dataset.motionIndicator = "";
  const place = () => {
    for (const item of group.querySelectorAll<HTMLElement>("[aria-pressed], [aria-selected]")) {
      if (item.matches(selector)) item.dataset.state = "active";
      else delete item.dataset.state;
    }
    const button = group.querySelector<HTMLElement>(selector);
    if (!button) return;
    bar.style.width = `${button.offsetWidth}px`;
    bar.style.transform = `translateX(${button.offsetLeft}px)`;
  };
  // A hidden switch measures zero, so it's placed again whenever its size changes.
  const sizing = new ResizeObserver(place);
  sizing.observe(group);
  const pressing = new MutationObserver(place);
  pressing.observe(group, { subtree: true, attributeFilter: ["aria-pressed", "aria-selected"] });
  group.dataset.indicator = "";
  group.dataset.motionSelect = "";
  return () => {
    sizing.disconnect();
    pressing.disconnect();
    bar.remove();
    delete group.dataset.indicator;
    delete group.dataset.motionSelect;
  };
}
