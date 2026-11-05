// The tools' switches: one indicator per switch slides to the pressed button, however it gets pressed, as on the old
// site. A hidden switch measures zero, so it's placed again, without sliding, whenever its size changes.
export function indicate(group: HTMLElement, selector = "[aria-pressed=true]"): () => void {
  const bar = group.appendChild(
    Object.assign(document.createElement("span"), { className: "indicator" }),
  );
  bar.setAttribute("aria-hidden", "true");
  const place = () => {
    const button = group.querySelector<HTMLElement>(selector);
    if (!button) return;
    bar.style.width = `${button.offsetWidth}px`;
    bar.style.transform = `translateX(${button.offsetLeft}px)`;
  };
  const sizing = new ResizeObserver(() => {
    bar.dataset.still = "";
    place();
    requestAnimationFrame(() => delete bar.dataset.still);
  });
  sizing.observe(group);
  const pressing = new MutationObserver(place);
  pressing.observe(group, { subtree: true, attributeFilter: ["aria-pressed"] });
  group.dataset.indicator = "";
  return () => {
    sizing.disconnect();
    pressing.disconnect();
    bar.remove();
    delete group.dataset.indicator;
  };
}
