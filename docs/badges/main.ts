import {
  badgeKeys,
  badgePresets,
  badgeDefaultIcon,
  badgeParams,
  badgeSvg,
  readBadge,
  sources,
  type BadgeSpec,
} from "../../packages/badge/src/svg.ts";

function start(root: HTMLElement) {
  const form = root.querySelector<HTMLFormElement>("#badge-form")!;
  const preview = root.querySelector<HTMLImageElement>("#badge-preview")!;
  const previewDark = root.querySelector<HTMLImageElement>("#badge-preview-dark")!;
  const empty = root.querySelector<HTMLElement>("#preview-empty")!;
  const status = root.querySelector<HTMLElement>("#preview-status")!;
  const error = root.querySelector<HTMLElement>("#form-error")!;
  const copyStatus = root.querySelector<HTMLElement>("#copy-status")!;
  const download = root.querySelector<HTMLButtonElement>("#download")!;
  const format = root.querySelector<HTMLSelectElement>("#export-format")!;
  const code = root.querySelector<HTMLTextAreaElement>("#export-code")!;
  const copyButton = root.querySelector<HTMLButtonElement>("#copy-code")!;
  const endpoint = new URL("/badge.svg", location.origin);
  const path = location.pathname;
  let controller: AbortController | undefined;
  let timer: ReturnType<typeof setTimeout>;
  let objectUrl = "";
  let currentSpec: BadgeSpec | undefined;
  let automaticIcon = false;
  let exports: Record<string, string> = {};
  const presets: Record<string, Record<string, string>> = {
    custom: { source: "static", label: "built with", value: "Comark UI", icon: "comark" },
    "npm-version": { source: "npm-version", label: "npm" },
    "npm-downloads": { source: "npm-downloads", label: "downloads" },
    "github-actions": { source: "github-actions", label: "build", icon: "github" },
    license: { source: "static", label: "license", value: "MIT", icon: "none" },
    docs: { source: "static", label: "docs", value: "comark-ui.onmax.me", icon: "comark" },
  };
  const control = (name: string) =>
    form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement;
  const defaultIcon = () =>
    badgeDefaultIcon({
      source: sources.find((source) => source === control("source").value) ?? "static",
      preset: badgePresets.find((preset) => preset === control("preset").value) ?? "default",
    });
  function fields() {
    const source = control("source").value;
    for (const element of form.querySelectorAll<HTMLElement>("[data-for]")) {
      element.hidden = !element.dataset.for?.split(" ").includes(source);
      for (const input of element.querySelectorAll<HTMLInputElement | HTMLSelectElement>(
        "input,select",
      ))
        input.disabled = element.hidden;
    }
    const labelColor = root.querySelector<HTMLElement>("[data-label-color]")!;
    const style = root.querySelector<HTMLElement>("[data-style]")!;
    style.hidden = control("preset").value !== "default";
    control("style").disabled = style.hidden;
    labelColor.hidden = style.hidden || control("style").value === "shadcn";
    control("labelColor").disabled = labelColor.hidden;
    for (const button of form.querySelectorAll<HTMLButtonElement>("[data-look]"))
      button.setAttribute("aria-pressed", String(button.dataset.look === control("preset").value));
    for (const button of form.querySelectorAll<HTMLButtonElement>("[data-preset]")) {
      const selected = Object.entries(presets[button.dataset.preset!]!).every(
        ([key, value]) => control(key).value === value,
      );
      button.setAttribute("aria-pressed", String(selected));
    }
  }
  function output() {
    code.value = exports[format.value] ?? "";
    copyButton.textContent = `Copy ${format.selectedOptions[0]!.text}`;
    copyButton.disabled = !code.value;
  }
  function shareUrl() {
    const url = new URL(location.href);
    url.search = currentSpec ? badgeParams(currentSpec).toString() : "";
    // Keep automatic logos implicit so restored builder links still follow the preset.
    if (automaticIcon) url.searchParams.delete("icon");
    if (format.value !== "markdown") url.searchParams.set("format", format.value);
    return url;
  }
  function updateUrl() {
    if (currentSpec) history.replaceState(history.state, "", shareUrl());
  }
  function clear() {
    controller?.abort();
    currentSpec = undefined;
    exports = {};
    output();
    download.disabled = true;
  }
  function display(svg: string, spec: BadgeSpec) {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    preview.src = previewDark.src = objectUrl;
    preview.alt =
      new DOMParser().parseFromString(svg, "image/svg+xml").querySelector("title")?.textContent ||
      spec.label;
    preview.hidden = false;
    empty.hidden = true;
    download.disabled = false;
  }
  async function refresh() {
    clear();
    fields();
    const active = (controller = new AbortController());
    error.textContent = "";
    for (const input of form.querySelectorAll("[aria-invalid]")) {
      input.removeAttribute("aria-invalid");
      if (input.getAttribute("name") === "color" || input.getAttribute("name") === "labelColor")
        input.setAttribute("aria-describedby", "color-help");
      else input.removeAttribute("aria-describedby");
    }
    const parsed = readBadge(Object.fromEntries(new FormData(form)));
    if (!parsed.ok) {
      error.textContent = parsed.error;
      control(parsed.field).setAttribute("aria-invalid", "true");
      control(parsed.field).setAttribute("aria-describedby", "form-error");
      status.textContent = "";
      preview.hidden = true;
      empty.hidden = false;
      empty.textContent = "Fix the highlighted field to preview.";
      return;
    }
    const spec = (currentSpec = parsed.value);
    const params = badgeParams(spec);
    const url = new URL(endpoint);
    url.search = params.toString();
    updateUrl();
    root.querySelector<HTMLElement>("#preview")!.dataset.theme = spec.theme;
    const alt = (
      spec.source === "static"
        ? [spec.label, spec.value].filter(Boolean).join(": ")
        : `${spec.label}: ${spec.package || spec.repository}`
    )
      .replaceAll("\\", "\\\\")
      .replaceAll("[", "\\[")
      .replaceAll("]", "\\]");
    exports = {
      markdown: `![${alt}](${url.href})`,
      comark: `:badge{${[...params].map(([key, value]) => (/^[\w .#/@-]+$/.test(value) ? `${key}="${value}"` : `:${key}='${JSON.stringify(value).replaceAll("'", "\\u0027")}'`)).join(" ")}}`,
      "image-url": url.href,
    };
    output();
    if (spec.source === "static") {
      display(badgeSvg(spec), spec);
      status.textContent = "";
      return;
    }
    status.textContent = "Loading…";
    preview.hidden = true;
    empty.hidden = false;
    empty.textContent = "Loading badge…";
    try {
      const response = await fetch(url, { signal: active.signal });
      if (!response.ok || !response.headers.get("content-type")?.includes("image/svg+xml"))
        throw new Error("Couldn't load the preview. Try refreshing.");
      const svg = await response.text();
      if (active.signal.aborted) return;
      display(svg, spec);
      status.textContent =
        response.headers.get("x-badge-status") === "unavailable"
          ? "Live data is unavailable. Check the package or workflow and refresh."
          : "";
    } catch (cause) {
      if (active.signal.aborted) return;
      status.textContent = cause instanceof Error ? cause.message : "Couldn't load the preview.";
      empty.textContent = "Preview unavailable";
    }
  }
  async function copy(value: string, label: string) {
    if (!value) {
      copyStatus.textContent = "Fix the badge options before copying.";
      return;
    }
    try {
      await navigator.clipboard.writeText(value);
      copyStatus.textContent = `${label} copied.`;
    } catch {
      copyStatus.textContent = "Clipboard unavailable. Select the code and copy it manually.";
    }
  }
  for (const button of form.querySelectorAll<HTMLButtonElement>("[data-preset]"))
    button.addEventListener("click", () => {
      const template = presets[button.dataset.preset!]!;
      for (const [key, value] of Object.entries(template)) control(key).value = value;
      automaticIcon = !template.icon;
      if (automaticIcon) control("icon").value = defaultIcon();
      clearTimeout(timer);
      void refresh();
    });
  for (const button of form.querySelectorAll<HTMLButtonElement>("[data-look]"))
    button.addEventListener("click", () => {
      control("preset").value = button.dataset.look!;
      if (automaticIcon) control("icon").value = defaultIcon();
      clearTimeout(timer);
      void refresh();
    });
  form.addEventListener("input", (event) => {
    if (event.target === format || event.target === code) return;
    if (event.target === control("icon")) automaticIcon = false;
    clear();
    fields();
    copyStatus.textContent = "";
    clearTimeout(timer);
    timer = setTimeout(() => void refresh(), 300);
  });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    clearTimeout(timer);
    void refresh();
    form.querySelector<HTMLElement>("[aria-invalid=true]")?.focus();
  });
  format.addEventListener("change", () => {
    output();
    updateUrl();
  });
  copyButton.addEventListener(
    "click",
    () => void copy(code.value, format.selectedOptions[0]!.text),
  );
  root
    .querySelector("#share")!
    .addEventListener("click", () => void copy(currentSpec ? shareUrl().href : "", "Builder link"));
  download.addEventListener("click", () => {
    if (download.disabled || !objectUrl) return;
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = "badge.svg";
    anchor.click();
  });
  function restore() {
    if (location.pathname !== path) return;
    form.reset();
    const initial = new URLSearchParams(location.search);
    automaticIcon = false;
    if (badgeKeys.some((key) => initial.has(key))) {
      automaticIcon = !initial.get("icon")?.trim();
      const restored = readBadge(Object.fromEntries(initial));
      if (restored.ok) {
        for (const key of badgeKeys) {
          const sources = control(key).closest<HTMLElement>("[data-for]")?.dataset.for;
          if (!sources || sources.split(" ").includes(restored.value.source))
            control(key).value = restored.value[key];
        }
      } else {
        for (const key of badgeKeys) if (initial.has(key)) control(key).value = initial.get(key)!;
      }
    } else {
      for (const [key, value] of Object.entries(presets.custom!)) control(key).value = value;
    }
    format.value = ["markdown", "comark", "image-url"].includes(initial.get("format") ?? "")
      ? initial.get("format")!
      : "markdown";
    clearTimeout(timer);
    void refresh();
  }
  function stop() {
    controller?.abort();
    clearTimeout(timer);
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    observer.disconnect();
    window.removeEventListener("popstate", restore);
  }
  const observer = new MutationObserver(() => {
    if (!root.isConnected) stop();
  });
  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener("popstate", restore);
  restore();
  if (document.readyState !== "loading") {
    const heading = root.closest(".page")?.querySelector("h1");
    if (heading) {
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
    }
  }
}
const root = document.currentScript?.previousElementSibling;
if (root instanceof HTMLElement && root.matches("[data-badge-builder]")) start(root);
