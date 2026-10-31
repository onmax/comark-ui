// Bundled by the packages with components: Vue, React, and Svelte call their `addStyles` when a component mounts.

/**
 * Adds a package's styles to the page once, unless the page already carries them as a `style` or a `link` with
 * `data-comark-<name>`, which is how the HTML renderer inlines them and how an app that imports `style.css` marks them.
 */
export function addStyles(name: string, css: string): void {
  const attribute = `data-comark-${name}`;
  if (document.querySelector(`style[${attribute}],link[${attribute}]`)) return;
  const style = document.createElement("style");
  style.setAttribute(attribute, "");
  style.textContent = css;
  document.head.append(style);
}
