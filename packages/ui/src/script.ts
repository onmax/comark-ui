declare global {
  interface Window {
    __comarkMermaid?: { users: number; stop: () => void };
  }
}

/**
 * Starts the Copy image and Copy source buttons of every `.cmm` Mermaid diagram on the page and returns a function that
 * stops them. Every caller shares one set of listeners, which stop with the last caller. The function is
 * self-contained: the HTML renderer inlines its source as a script, so it must not use anything from outside its body.
 */
export function start(): () => void {
  const running = window.__comarkMermaid;
  if (running) {
    running.users++;
    return running.stop;
  }
  const listeners = new AbortController();
  const signal = listeners.signal;
  document.documentElement.setAttribute("data-mermaid-ready", "");
  const links = new Set<string>();

  // Pele paints with CSS variables, which an SVG drawn as an image can't see, so every element of the copy takes the
  // paint and type it shows on the page.
  const PROPERTIES = [
    "fill",
    "fill-opacity",
    "stroke",
    "stroke-opacity",
    "stroke-width",
    "stroke-dasharray",
    "stroke-linecap",
    "stroke-linejoin",
    "opacity",
    "color",
    "rx",
    "ry",
    "font-family",
    "font-size",
    "font-weight",
    "font-style",
    "letter-spacing",
    "text-anchor",
    "dominant-baseline",
    "paint-order",
  ];

  // The first opaque background from the diagram up, so the image has the page's color under it. A 1px canvas reads
  // any color syntax the page uses, oklch included.
  function background(from: Element): string {
    const probe = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
    for (let at: Element | null = from; at && probe; at = at.parentElement) {
      const color = getComputedStyle(at).backgroundColor;
      probe.clearRect(0, 0, 1, 1);
      probe.fillStyle = color;
      probe.fillRect(0, 0, 1, 1);
      if (probe.getImageData(0, 0, 1, 1).data[3] === 255) return color;
    }
    return "#fff";
  }

  function png(root: Element): Promise<Blob> {
    const svg = root.querySelector<SVGSVGElement>(".pele-diagram>svg");
    if (!svg) return Promise.reject(new Error("no diagram"));
    const width = Number(svg.getAttribute("width")) || svg.viewBox.baseVal.width;
    const height = Number(svg.getAttribute("height")) || svg.viewBox.baseVal.height;
    if (!(width > 0 && height > 0)) return Promise.reject(new Error("no size"));
    const copy = svg.cloneNode(true);
    if (!(copy instanceof SVGSVGElement)) return Promise.reject(new Error("no diagram"));
    const from = [svg, ...svg.querySelectorAll("*")];
    const to = [copy, ...copy.querySelectorAll("*")];
    from.forEach((node, index) => {
      const into = to[index];
      if (!(into instanceof SVGElement)) return;
      const style = getComputedStyle(node);
      for (const property of PROPERTIES)
        into.style.setProperty(property, style.getPropertyValue(property));
    });
    // The whole diagram at its own size, even while Pele's in-place zoom shows a part of it.
    copy.setAttribute("viewBox", `0 0 ${width} ${height}`);
    copy.setAttribute("width", String(width));
    copy.setAttribute("height", String(height));
    copy.style.maxWidth = "none";
    copy.style.width = `${width}px`;
    copy.style.height = `${height}px`;
    const scale = Math.min(2, 4096 / width, 4096 / height);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const fill = background(svg.parentElement ?? root);
    const image = new Image();
    return new Promise((resolve, reject) => {
      image.onerror = () => reject(new Error("not drawn"));
      image.onload = () => {
        const context = canvas.getContext("2d");
        if (!context) return reject(new Error("no canvas"));
        context.fillStyle = fill;
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error("no image"))),
          "image/png",
        );
      };
      image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(copy))}`;
    });
  }

  const part = <T extends Element>(root: Element, selector: string) =>
    root.querySelector<T>(`:scope>.cmm-bar>${selector}`);

  function say(root: Element, button: Element, message: string, state: "done" | "failed") {
    const status = part(root, ".cmm-status");
    if (!status) return;
    button.setAttribute("data-state", state);
    status.textContent = message;
    setTimeout(
      () => {
        if (status.textContent !== message) return;
        button.removeAttribute("data-state");
        status.textContent = "";
      },
      state === "done" ? 1500 : 6000,
    );
  }

  function copyImage(root: Element, button: Element) {
    const open = part<HTMLAnchorElement>(root, ".cmm-open");
    if (open) open.hidden = true;
    // Safari only lets a click write what it hands over before awaiting, so the image goes up as a promise of one.
    const image = png(root);
    image.catch(() => {});
    // SAFETY: `clipboard` is missing outside secure contexts, whatever the DOM types say.
    const clipboard = navigator.clipboard as Clipboard | undefined;
    const written =
      clipboard && "ClipboardItem" in window
        ? clipboard.write([new ClipboardItem({ "image/png": image })])
        : Promise.reject(new Error("no clipboard"));
    written.then(
      () => say(root, button, "Image copied", "done"),
      () =>
        image.then(
          (blob) => {
            if (!open) return;
            if (open.href) {
              URL.revokeObjectURL(open.href);
              links.delete(open.href);
            }
            open.href = URL.createObjectURL(blob);
            links.add(open.href);
            open.hidden = false;
            say(root, button, "Couldn't copy the image. Open the PNG to save it.", "failed");
          },
          () => say(root, button, "Couldn't draw the image. Copy the source instead.", "failed"),
        ),
    );
  }

  function copySource(root: Element, button: Element) {
    const source = (root.getAttribute("data-source") ?? "").replace(/\n$/, "");
    // A fence longer than any run of backticks in the source, so none of them closes it.
    const longest = Math.max(2, ...(source.match(/`+/g) ?? []).map((run) => run.length));
    const fence = "`".repeat(longest + 1);
    const markdown = `${fence}mermaid\n${source}\n${fence}`;
    const shown = root.querySelector(":scope>.cmm-markdown");
    // Without clipboard access, on a page served over plain http or in a frame that isn't allowed it, the Markdown
    // shows under the diagram, selected, so the reader's own copy keys take it.
    const failed = () => {
      const pre = shown ?? document.createElement("pre");
      pre.className = "cmm-markdown";
      pre.textContent = markdown;
      if (!shown) root.append(pre);
      const range = document.createRange();
      range.selectNodeContents(pre);
      const selection = getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      say(root, button, "Couldn't copy, so the source is selected. Press Ctrl+C or ⌘C.", "failed");
    };
    // SAFETY: `clipboard` is missing outside secure contexts, whatever the DOM types say.
    const clipboard = navigator.clipboard as Clipboard | undefined;
    if (!clipboard) return failed();
    clipboard.writeText(markdown).then(() => {
      shown?.remove();
      say(root, button, "Source copied", "done");
    }, failed);
  }

  document.addEventListener(
    "click",
    (event) => {
      const button =
        event.target instanceof Element
          ? event.target.closest<HTMLElement>(".cmm>.cmm-bar>button")
          : null;
      const root = button?.parentElement?.parentElement;
      if (!button || !root) return;
      if (button.classList.contains("cmm-image")) copyImage(root, button);
      else if (button.classList.contains("cmm-source")) copySource(root, button);
    },
    { signal },
  );

  const state = {
    users: 1,
    stop: () => {
      if (--state.users > 0) return;
      listeners.abort();
      for (const link of links) URL.revokeObjectURL(link);
      document.documentElement.removeAttribute("data-mermaid-ready");
      window.__comarkMermaid = undefined;
    },
  };
  window.__comarkMermaid = state;
  return state.stop;
}
