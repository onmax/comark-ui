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
export const icons = ["none", "package", "npm", "github", "check"] as const;
export type BadgeSource = (typeof sources)[number];
export type BadgeSpec = {
  source: BadgeSource;
  label: string;
  value: string;
  color: string;
  labelColor: string;
  icon: (typeof icons)[number];
  theme: "light" | "dark";
  style: "subtle" | "solid";
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
    return { ok: false, field: "icon", error: "Use icon none, package, npm, github, or check." };
  const theme = field("theme", "light");
  const style = field("style", "subtle");
  const period = field("period", "month");
  if (theme !== "light" && theme !== "dark")
    return { ok: false, field: "theme", error: "Use theme light or dark." };
  if (style !== "subtle" && style !== "solid")
    return { ok: false, field: "style", error: "Use style subtle or solid." };
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
    theme: "light",
    style: "subtle",
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
    '<circle cx="5" cy="3" r="2"/><circle cx="11" cy="5" r="2"/><circle cx="5" cy="13" r="2"/><path d="M5 5v6m0-2c6 0 6-2 6-2"/>',
  npm: '<path d="M1 4h14v8H8V6H5v6H1Z M11 6v6"/>',
};
const textColor = (hex: string) => {
  const rgb = [1, 3, 5]
    .map((start) => Number.parseInt(hex.slice(start, start + 2), 16) / 255)
    .map((value) => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
  return rgb[0]! * 0.2126 + rgb[1]! * 0.7152 + rgb[2]! * 0.0722 > 0.179 ? "#000000" : "#ffffff";
};

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
  const dark = input.theme === "dark";
  const bg = dark ? "#171717" : "#ffffff";
  const fg = dark ? "#fafafa" : "#171717";
  const solid = input.style === "solid";
  const labelFg = solid ? textColor(labelColor) : fg;
  const valueFg = solid ? textColor(color) : fg;
  const text = (content: string, x: number, fill: string) =>
    `<text x="${x}" y="17" fill="${fill}" font-family="DejaVu Sans Mono,monospace" font-size="12" textLength="${Array.from(content).length * 7.2}" lengthAdjust="spacingAndGlyphs">${xml(content)}</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="26" viewBox="0 0 ${width} 26" role="img" aria-label="${xml(label ? `${label}: ${value}` : value)}"><title>${xml(label ? `${label}: ${value}` : value)}</title><rect width="${width}" height="26" rx="6" fill="${bg}"/><svg width="${width}" height="26" viewBox="0 0 ${width} 26"><defs><clipPath id="badge"><rect width="${width}" height="26" rx="6"/></clipPath></defs><g clip-path="url(#badge)"><path d="M0 0h${left}v26H0Z" fill="${labelColor}" fill-opacity="${solid ? 1 : 0.12}"/><path d="M${left} 0h${right}v26H${left}Z" fill="${color}" fill-opacity="${solid ? 1 : 0.14}"/></g></svg>${left ? `<path d="M${left} 1v24" stroke="${fg}" stroke-opacity=".12"/>` : ""}${icon ? `<g transform="translate(9 5)" fill="none" stroke="${label ? labelFg : valueFg}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${icon}</g>` : ""}${label ? text(label, 10 + iconSpace, labelFg) : ""}${text(value, left + 10 + (label ? 0 : iconSpace), valueFg)}<rect x=".5" y=".5" width="${width - 1}" height="25" rx="5.5" fill="none" stroke="${fg}" stroke-opacity=".18"/></svg>`;
}
