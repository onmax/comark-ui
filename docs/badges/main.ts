import {
  badgeKeys,
  badgeParams,
  badgeSvg,
  readBadge,
  type BadgeSpec,
} from "../../packages/badge/src/svg.ts";

const form = document.querySelector<HTMLFormElement>("#badge-form")!;
const preview = document.querySelector<HTMLImageElement>("#badge-preview")!;
const empty = document.querySelector<HTMLElement>("#preview-empty")!;
const status = document.querySelector<HTMLElement>("#preview-status")!;
const error = document.querySelector<HTMLElement>("#form-error")!;
const copyStatus = document.querySelector<HTMLElement>("#copy-status")!;
const download = document.querySelector<HTMLButtonElement>("#download")!;
const endpoint = new URL("/badge.svg", location.origin);
let controller: AbortController | undefined;
let timer: ReturnType<typeof setTimeout>;
let objectUrl = "";
let currentSvg = "";
let currentSpec: BadgeSpec | undefined;
const defaults: Record<string, Record<string, string>> = {
  static: { label: "built with", value: "Comark UI", icon: "package", color: "#15803d" },
  "npm-version": { label: "npm", icon: "npm", color: "info" },
  "npm-downloads": { label: "downloads", icon: "npm", color: "success" },
  "github-actions": { label: "build", icon: "github", color: "primary" },
};
const control = (name: string) =>
  form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement;
const output = (name: string) => document.getElementById(name) as HTMLTextAreaElement;
function fields() {
  const source = control("source").value;
  for (const element of form.querySelectorAll<HTMLElement>("[data-for]")) {
    element.hidden = !element.dataset.for?.split(" ").includes(source);
    for (const input of element.querySelectorAll<HTMLInputElement | HTMLSelectElement>(
      "input,select",
    ))
      input.disabled = element.hidden;
  }
  for (const button of form.querySelectorAll<HTMLButtonElement>("[data-source]"))
    button.setAttribute("aria-pressed", String(button.dataset.source === source));
  document.querySelector<HTMLElement>("#source-label")!.textContent =
    source === "static"
      ? "Custom badge"
      : source === "github-actions"
        ? "Live workflow status"
        : "Live npm data";
}
function display(svg: string, spec: BadgeSpec) {
  if (objectUrl) URL.revokeObjectURL(objectUrl);
  objectUrl = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  currentSvg = svg;
  preview.src = objectUrl;
  preview.alt =
    new DOMParser().parseFromString(svg, "image/svg+xml").querySelector("title")?.textContent ||
    `${spec.label}: ${spec.value || spec.package || spec.repository}`;
  preview.hidden = false;
  empty.hidden = true;
  download.disabled = false;
}
async function refresh() {
  controller?.abort();
  controller = new AbortController();
  const active = controller;
  error.textContent = "";
  for (const input of form.querySelectorAll("[aria-invalid]")) {
    input.removeAttribute("aria-invalid");
    if (input.getAttribute("name") === "color" || input.getAttribute("name") === "labelColor")
      input.setAttribute("aria-describedby", "color-help");
    else input.removeAttribute("aria-describedby");
  }
  const parsed = readBadge(Object.fromEntries(new FormData(form)));
  download.disabled = true;
  currentSvg = "";
  currentSpec = undefined;
  if (!parsed.ok) {
    error.textContent = parsed.error;
    control(parsed.field).setAttribute("aria-invalid", "true");
    control(parsed.field).setAttribute("aria-describedby", "form-error");
    status.textContent = "Update the options to preview your badge.";
    preview.hidden = true;
    empty.hidden = false;
    empty.textContent = "Your badge will appear here.";
    for (const id of ["markdown", "comark", "image-url"]) output(id).value = "";
    return;
  }
  const spec = parsed.value;
  currentSpec = spec;
  const params = badgeParams(spec);
  const url = new URL(endpoint);
  url.search = params.toString();
  history.replaceState(null, "", `?${params}`);
  document.querySelector<HTMLElement>("#preview")!.dataset.theme = spec.theme;
  const alt = (
    spec.source === "static"
      ? [spec.label, spec.value].filter(Boolean).join(": ")
      : `${spec.label}: ${spec.package || spec.repository}`
  )
    .replaceAll("\\", "\\\\")
    .replaceAll("[", "\\[")
    .replaceAll("]", "\\]");
  output("markdown").value = `![${alt}](${url.href})`;
  // Bound attributes are JSON strings, so quotes and braces in a label remain literal.
  output("comark").value =
    `:badge{${[...params].map(([key, value]) => (/^[\w .#/@-]+$/.test(value) ? `${key}="${value}"` : `:${key}='${JSON.stringify(value).replaceAll("'", "\\u0027")}'`)).join(" ")}}`;
  output("image-url").value = url.href;
  if (spec.source === "static") {
    display(badgeSvg(spec), spec);
    status.textContent = "Rendered locally. Ready to copy or download.";
    return;
  }
  status.textContent = "Loading the latest data…";
  preview.hidden = true;
  empty.hidden = false;
  empty.textContent = "Loading badge…";
  try {
    const response = await fetch(url, { signal: active.signal });
    if (!response.ok || !response.headers.get("content-type")?.includes("image/svg+xml"))
      throw new Error("The badge service could not load this preview. Try refreshing.");
    const svg = await response.text();
    if (active.signal.aborted) return;
    display(svg, spec);
    status.textContent =
      response.headers.get("x-badge-status") === "unavailable"
        ? "Live data is unavailable. Check the public package or workflow, then try again."
        : spec.source === "github-actions"
          ? "Latest workflow run. Cached for up to one minute."
          : spec.source === "npm-version"
            ? "Latest npm release. Cached for up to five minutes."
            : "Recent npm downloads. Cached for up to one hour.";
  } catch (cause) {
    if (active.signal.aborted) return;
    status.textContent =
      cause instanceof Error ? cause.message : "Could not load the badge. Try again.";
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
    copyStatus.textContent =
      "Clipboard access is unavailable. Select the text and copy it manually.";
  }
}
for (const button of form.querySelectorAll<HTMLButtonElement>("[data-source]"))
  button.addEventListener("click", () => {
    const source = button.dataset.source!;
    control("source").value = source;
    for (const [key, value] of Object.entries(defaults[source]!)) control(key).value = value;
    fields();
    clearTimeout(timer);
    void refresh();
  });
form.addEventListener("input", () => {
  controller?.abort();
  clearTimeout(timer);
  currentSpec = undefined;
  currentSvg = "";
  for (const id of ["markdown", "comark", "image-url"]) output(id).value = "";
  download.disabled = true;
  timer = setTimeout(() => void refresh(), 450);
});
form.addEventListener("submit", (event) => {
  event.preventDefault();
  clearTimeout(timer);
  void refresh();
  form.querySelector<HTMLElement>("[aria-invalid=true]")?.focus();
});
for (const button of document.querySelectorAll<HTMLButtonElement>("[data-copy]"))
  button.addEventListener(
    "click",
    () => void copy(output(button.dataset.copy!).value, button.textContent!.replace("Copy ", "")),
  );
document
  .querySelector("#share")!
  .addEventListener("click", () => void copy(currentSpec ? location.href : "", "Builder link"));
download.addEventListener("click", () => {
  if (!currentSvg || !objectUrl) return;
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = "badge.svg";
  anchor.click();
});
const initial = new URLSearchParams(location.search);
const restored = readBadge(Object.fromEntries(initial));
if (restored.ok) {
  for (const key of badgeKeys) control(key).value = restored.value[key];
} else {
  for (const key of badgeKeys) if (initial.has(key)) control(key).value = initial.get(key)!;
}
fields();
void refresh();
