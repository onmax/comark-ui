export const sources = ["static", "npm-version", "npm-downloads", "github-actions"] as const;
export const badgeColors = {
  primary: "#525252",
  secondary: "#737373",
  success: "#15803d",
  info: "#1d4ed8",
  warning: "#a16207",
  error: "#b91c1c",
  neutral: "#525252",
};
export const icons = ["none", "package", "npm", "github", "comark", "shadcn", "check"] as const;
export type BadgeSource = (typeof sources)[number];
export type BadgeSpec = {
  source: BadgeSource;
  label: string;
  value: string;
  color: string;
  labelColor: string;
  icon: (typeof icons)[number];
  theme: "auto" | "light" | "dark";
  style: "shadcn" | "subtle" | "solid";
  package: string;
  repository: string;
  workflow: string;
  branch: string;
  period: "day" | "week" | "month";
};
export type BadgeImage = Pick<
  BadgeSpec,
  "label" | "value" | "color" | "labelColor" | "icon" | "theme" | "style"
>;
export const badgeKeys = [
  "source",
  "label",
  "value",
  "color",
  "labelColor",
  "icon",
  "theme",
  "style",
  "package",
  "repository",
  "workflow",
  "branch",
  "period",
] as const;
const palette = (value: string) =>
  Object.entries(badgeColors).find(([name]) => name === value)?.[1] ?? value;
const oneOf = <T extends string>(values: readonly T[], value: string): value is T =>
  values.some((item) => item === value);
const validColor = (value: string) =>
  Object.hasOwn(badgeColors, value) || /^#[\da-f]{6}$/i.test(value);
const hasControl = (value: string) =>
  Array.from(value).some((char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127);
const plain = (value: unknown) => (typeof value === "string" ? value.trim() : "");

/** Reads the same options from Markdown, the builder, and an image URL. */
export function readBadge(
  input: Record<string, unknown>,
): { ok: true; value: BadgeSpec } | { ok: false; error: string; field: string } {
  const field = (key: string, fallback = "") => plain(input[key]) || fallback;
  const source = field("source", "static");
  if (!oneOf(sources, source))
    return {
      ok: false,
      field: "source",
      error: "Use source static, npm-version, npm-downloads, or github-actions.",
    };
  const defaults =
    source === "npm-version"
      ? ["npm", "npm"]
      : source === "npm-downloads"
        ? ["downloads", "npm"]
        : source === "github-actions"
          ? ["build", "github"]
          : ["", "none"];
  const label = field("label", defaults[0]);
  const value = field("value");
  if (source === "static" && !value)
    return { ok: false, field: "value", error: "Give a static image badge a value." };
  if ([label, value].some((text) => text.length > 80 || hasControl(text)))
    return {
      ok: false,
      field: label.length > 80 || hasControl(label) ? "label" : "value",
      error: "Keep label and value to 80 characters without control characters.",
    };
  const color = field("color", "primary");
  const labelColor = field("labelColor", "neutral");
  if (![color, labelColor].every(validColor))
    return {
      ok: false,
      field: validColor(color) ? "labelColor" : "color",
      error: "Use a semantic color or a six-digit hex color such as #15803d.",
    };
  const icon = field("icon", defaults[1]);
  if (!oneOf(icons, icon))
    return {
      ok: false,
      field: "icon",
      error: "Use icon none, package, npm, github, comark, shadcn, or check.",
    };
  const theme = field("theme", "auto");
  const style = field("style", "shadcn");
  const period = field("period", "month");
  if (theme !== "auto" && theme !== "light" && theme !== "dark")
    return { ok: false, field: "theme", error: "Use theme auto, light, or dark." };
  if (style !== "shadcn" && style !== "subtle" && style !== "solid")
    return { ok: false, field: "style", error: "Use style shadcn, subtle, or solid." };
  if (period !== "day" && period !== "week" && period !== "month")
    return { ok: false, field: "period", error: "Use period day, week, or month." };
  const pkg = field("package");
  const repository = field("repository");
  const workflow = field("workflow");
  const branch = field("branch");
  if (
    source.startsWith("npm-") &&
    (pkg.length > 214 || !/^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/.test(pkg))
  )
    return {
      ok: false,
      field: "package",
      error: "Set package to an npm package name, such as comark-ui or @scope/name.",
    };
  if (
    source === "github-actions" &&
    (!/^[a-zA-Z0-9][a-zA-Z0-9-]{0,38}\/[a-zA-Z0-9_.-]{1,100}$/.test(repository) ||
      !/^[\w.-]+\.ya?ml$/.test(workflow) ||
      /\/\.{1,2}$/.test(repository) ||
      workflow.length > 100 ||
      branch.length > 200 ||
      hasControl(branch))
  )
    return {
      ok: false,
      field:
        !/^[a-zA-Z0-9][a-zA-Z0-9-]{0,38}\/[a-zA-Z0-9_.-]{1,100}$/.test(repository) ||
        /\/\.{1,2}$/.test(repository)
          ? "repository"
          : !/^[\w.-]+\.ya?ml$/.test(workflow) || workflow.length > 100
            ? "workflow"
            : "branch",
      error:
        "Set repository to owner/repo and workflow to a YAML filename; keep branch under 200 characters without control characters.",
    };
  return {
    ok: true,
    value: {
      source,
      label,
      value: source === "static" ? value : "",
      color,
      labelColor,
      icon,
      theme,
      style,
      package: source.startsWith("npm-") ? pkg : "",
      repository: source === "github-actions" ? repository : "",
      workflow: source === "github-actions" ? workflow : "",
      branch: source === "github-actions" ? branch : "",
      period: source === "npm-downloads" ? period : "month",
    },
  };
}

/** Canonical query parameters for image URLs and shared builder configurations. */
export function badgeParams(spec: BadgeSpec): URLSearchParams {
  const defaults: Partial<BadgeSpec> = {
    source: "static",
    color: "primary",
    labelColor: "neutral",
    theme: "auto",
    style: "shadcn",
    period: "month",
  };
  return new URLSearchParams(
    badgeKeys
      .filter((key) => spec[key] !== "" && spec[key] !== defaults[key])
      .map((key) => [key, spec[key]]),
  );
}

const xml = (text: string) =>
  text.replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[char] ?? "",
  );
const paths: Record<BadgeSpec["icon"], string> = {
  none: "",
  check: '<path d="m3 8 3 3 7-7"/>',
  package: '<path d="m8 1 6 3v8l-6 3-6-3V4Z M2 4l6 3 6-3 M8 7v8 M5 2.5l6 3"/>',
  github:
    '<path fill="currentColor" stroke="none" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>',
  npm: '<path fill="currentColor" stroke="none" transform="scale(.6667)" fill-rule="evenodd" d="M1.76 0C.79 0 0 .79 0 1.76v20.48C0 23.21.79 24 1.76 24h20.48c.97 0 1.76-.79 1.76-1.76V1.76C24 .79 23.21 0 22.24 0ZM5.13 5.32l13.84.02-.01 13.84H15.5l.01-10.38h-3.46l-.01 10.38H5.11Z"/>',
  comark:
    '<g transform="scale(.5)"><rect stroke="currentColor" x="6.5" y="11.4" width="19" height="10.2" fill="none" stroke-width="1.3"/><path fill="currentColor" d="M7.87 20.24V12.76H10.07L12.26 15.51 14.46 12.76H16.66V20.24H14.46V15.95L12.26 18.7 10.07 15.95V20.24ZM18.64 12.98h2.19v2.12h-2.19ZM18.64 17.9h2.19v2.12h-2.19ZM21.94 12.98h2.19v2.12h-2.19ZM21.94 17.9h2.19v2.12h-2.19Z"/><path d="M9.3 7.3C15.3 3.7 27.1 4.5 28.7 11.5 30.4 19.1 22 26.7 12.8 27.2 5.9 27.6 2 23.5 3.5 18.1 4.8 13.3 11.1 9.7 18.1 9.6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></g>',
  shadcn: '<path d="m9 2-7 7m12-7L2 14"/>',
};
/** A built-in logo or symbol for interfaces that offer the same badge options. */
export function badgeIcon(name: BadgeSpec["icon"]): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${paths[name] ?? ""}</svg>`;
}
const textColor = (hex: string) => {
  const rgb = [1, 3, 5]
    .map((start) => Number.parseInt(hex.slice(start, start + 2), 16) / 255)
    .map((value) => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
  return rgb[0]! * 0.2126 + rgb[1]! * 0.7152 + rgb[2]! * 0.0722 > 0.179 ? "#000000" : "#ffffff";
};

// The prose badges' dark-mode tones, since the light ones are too dim for a dot on a dark badge.
const dots = {
  success: "#4ade80",
  info: "#60a5fa",
  warning: "#facc15",
  error: "#f87171",
};
// Helvetica's advances from space to tilde, in thousandths of an em. Arial and Liberation Sans share them, so text
// drawn in any of the three fills its `textLength` without being stretched.
const advances = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556,
  556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667,
  611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667,
  667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500,
  222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584,
];
const measure = (text: string) =>
  Array.from(text).reduce((sum, char) => {
    const code = char.codePointAt(0)!;
    return sum + (advances[code - 32] ?? (code < 0x2e80 ? 600 : 1000)) * 0.012;
  }, 0);

/**
 * Colors live in a `<style>` instead of attributes so an `auto` badge can carry both palettes: inside an `<img>`, the
 * SVG's `prefers-color-scheme` follows the embedding page's `color-scheme`, which GitHub sets from the reader's theme.
 */
function paints(theme: BadgeSpec["theme"], tones: (dark: boolean) => Record<string, string>) {
  const rules = (dark: boolean) =>
    Object.entries(tones(dark))
      .map(([name, declarations]) => `.${name}{${declarations}}`)
      .join("");
  return `<style>${
    theme === "auto"
      ? `${rules(false)}@media (prefers-color-scheme:dark){${rules(true)}}`
      : rules(theme === "dark")
  }</style>`;
}

/**
 * One neutral outline for every badge, so a row of them reads as a set: the label muted, a divider, then the value.
 * A status color is a dot before the value instead of a colored outline.
 */
function shadcn(
  label: string,
  value: string,
  color: string,
  icon: string,
  theme: BadgeSpec["theme"],
  status: boolean,
) {
  const dot = (dark: boolean) =>
    (dark && Object.entries(dots).find(([name]) => name === color)?.[1]) || palette(color);
  const style = paints(theme, (dark) => ({
    b: `fill:${dark ? "#171717" : "#ffffff"};stroke:${dark ? "#404040" : "#e5e5e5"}`,
    m: `fill:${dark ? "#a3a3a3" : "#737373"}`,
    l: `stroke:${dark ? "#404040" : "#e5e5e5"}`,
    d: `fill:${dot(dark)}`,
    f: `fill:${dark ? "#fafafa" : "#171717"}`,
    i: `color:${dark ? "#fafafa" : "#171717"}`,
  }));
  const start = 9 + (icon ? 20 : 0);
  const left = label ? Math.round(start + measure(label) + 8) : 0;
  const valueStart = label ? left + 8 : start;
  const valueX = valueStart + (status ? 11 : 0);
  const width = Math.ceil(valueX + measure(value) + 9);
  const name = xml(label ? `${label}: ${value}` : value);
  const text = (content: string, x: number, paint: string) =>
    `<text x="${x}" y="17" class="${paint}" font-family="Arial,Helvetica,sans-serif" font-size="12" textLength="${measure(content).toFixed(1)}" lengthAdjust="spacingAndGlyphs">${xml(content)}</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="26" viewBox="0 0 ${width} 26" role="img" aria-label="${name}"><title>${name}</title>${style}<rect x=".5" y=".5" width="${width - 1}" height="25" rx="6" class="b"/>${icon ? `<g transform="translate(9 6) scale(.875)" class="i" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${icon}</g>` : ""}${label ? `${text(label, start, "m")}<path d="M${left + 0.5} 1v24" class="l"/>` : ""}${status ? `<circle cx="${valueStart + 3}" cy="13" r="3" class="d"/>` : ""}${text(value, valueX, "f")}</svg>`;
}

/** A self-contained SVG. Text uses fixed advances, so no font download or canvas is needed. */
export function badgeSvg(input: BadgeImage): string {
  const label = input.label.slice(0, 80);
  const value = input.value.slice(0, 80);
  const color = validColor(input.color) ? palette(input.color) : badgeColors.primary;
  const labelColor = validColor(input.labelColor) ? palette(input.labelColor) : badgeColors.neutral;
  const icon = paths[input.icon] ?? "";
  const iconSpace = icon ? 22 : 0;
  const left = label ? Array.from(label).length * 7.2 + 20 + iconSpace : 0;
  const right = Array.from(value).length * 7.2 + 20 + (label ? 0 : iconSpace);
  const width = Math.ceil(left + right);
  const solid = input.style === "solid";
  if (input.style === "shadcn")
    return shadcn(
      label,
      value,
      validColor(input.color) ? input.color : "primary",
      icon,
      input.theme,
      validColor(input.color) && !["primary", "secondary", "neutral"].includes(input.color),
    );
  const fg = (dark: boolean) => (dark ? "#fafafa" : "#171717");
  const labelFg = (dark: boolean) => (solid ? textColor(labelColor) : fg(dark));
  const valueFg = (dark: boolean) => (solid ? textColor(color) : fg(dark));
  const style = paints(input.theme, (dark) => ({
    b: `fill:${dark ? "#171717" : "#ffffff"}`,
    e: `stroke:${fg(dark)}`,
    t: `fill:${labelFg(dark)}`,
    v: `fill:${valueFg(dark)}`,
    i: `color:${label ? labelFg(dark) : valueFg(dark)}`,
  }));
  const text = (content: string, x: number, paint: string) =>
    `<text x="${x}" y="17" class="${paint}" font-family="DejaVu Sans Mono,monospace" font-size="12" textLength="${Array.from(content).length * 7.2}" lengthAdjust="spacingAndGlyphs">${xml(content)}</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="26" viewBox="0 0 ${width} 26" role="img" aria-label="${xml(label ? `${label}: ${value}` : value)}"><title>${xml(label ? `${label}: ${value}` : value)}</title>${style}<rect width="${width}" height="26" rx="6" class="b"/><svg width="${width}" height="26" viewBox="0 0 ${width} 26"><defs><clipPath id="badge"><rect width="${width}" height="26" rx="6"/></clipPath></defs><g clip-path="url(#badge)"><path d="M0 0h${left}v26H0Z" fill="${labelColor}" fill-opacity="${solid ? 1 : 0.12}"/><path d="M${left} 0h${right}v26H${left}Z" fill="${color}" fill-opacity="${solid ? 1 : 0.14}"/></g></svg>${left ? `<path d="M${left} 1v24" class="e" stroke-opacity=".12"/>` : ""}${icon ? `<g transform="translate(9 5)" class="i" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${icon}</g>` : ""}${label ? text(label, 10 + iconSpace, "t") : ""}${text(value, left + 10 + (label ? 0 : iconSpace), "v")}<rect x=".5" y=".5" width="${width - 1}" height="25" rx="5.5" fill="none" class="e" stroke-opacity=".18"/></svg>`;
}
