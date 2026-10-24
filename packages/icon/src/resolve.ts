import type { IconifyJSON } from "@iconify/types";
import { getIconData, iconToHTML, iconToSVG, svgToData } from "@iconify/utils";

/**
 * An icon set: an Iconify set as `@iconify-json/*` exports it, such as `icons` from `@iconify-json/lucide`, or SVG
 * markup by name, such as your own files loaded with `import.meta.glob("./icons/*.svg", { query: "?raw" })`.
 */
export type IconCollection = IconifyJSON | Record<string, string>;

export type IconOptions = {
  /** Sets by prefix, used before the Iconify API: `{ lucide }` makes `lucide:apple` resolve without a request. */
  collections?: Record<string, IconCollection>;
  /**
   * Fetch icons of sets not in `collections` from the Iconify API while parsing. `true` by default; a string is the
   * URL of an API of your own, and `false` resolves only `collections`.
   */
  fetch?: boolean | string;
};

/** An icon ready to draw: a URL, the width over the height, and whether it paints in the text's color. */
export type IconData = { name: string; src: string; ratio: number; mask: boolean };

/** Why an icon can't be drawn. `describeIconProblem` turns one into a sentence. */
export type IconProblem = { problem: "name" | "set" | "missing" | "load"; reason?: string };

/** Resolves icon names. Plugins that draw icons take one, so a page sets its options once. */
export interface Icons {
  /** Resolves each value, an icon name or an image URL. Never throws: a value it can't draw maps to its problem. */
  resolve(values: Iterable<string>): Promise<Map<string, IconData | IconProblem>>;
}

const API = "https://api.iconify.design";
const PART = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const LINK = /^(?:https?:\/\/|\.{0,2}\/)/;
// Iconify's prefixes with a hyphen. An `i-simple-icons-nuxt` name has no colon to split at, so these are matched
// first, longest first, before the first word is taken as the prefix.
const HYPHENATED =
  "akar-icons ant-design at-icons bitcoin-icons circle-flags cryptocurrency-color devicon-plain dinkie-icons duo-icons emojione-monotone emojione-v1 energy-icons entypo-social eos-icons fa-brands fa-regular fa-solid fa6-brands fa6-regular fa6-solid fa7-brands fa7-regular fa7-solid file-icons flat-color-icons flat-ui fluent-color fluent-emoji fluent-emoji-flat fluent-emoji-high-contrast fluent-mdl2 game-icons glyphs-poly gravity-ui griddy-icons grommet-icons heroicons-outline heroicons-solid icomoon-free icon-park icon-park-outline icon-park-solid icon-park-twotone keyline-icons lets-icons line-md lucide-extended lucide-lab material-icon-theme material-symbols material-symbols-light mdi-light medical-icon meteor-icons mono-icons noto-v1 pepicons-pencil pepicons-pop pepicons-print qlementine-icons radix-icons rivet-icons si-glyph simple-icons simple-line-icons skill-icons streamline-block streamline-color streamline-cyber streamline-cyber-color streamline-emojis streamline-flex streamline-flex-color streamline-freehand streamline-freehand-color streamline-kameleon-color streamline-logos streamline-pixel streamline-plump streamline-plump-color streamline-sharp streamline-sharp-color streamline-stickies-color streamline-ultimate streamline-ultimate-color svg-spinners system-uicons thesvg-color token-branded vscode-icons".split(
    " ",
  );

/**
 * Splits `lucide:apple`, `i-lucide:apple`, or `i-lucide-apple`, as Nuxt UI writes it, into its set and name.
 * `prefixes` are matched first in the hyphenated form.
 */
export function parseIconName(value: string, prefixes: Iterable<string> = []) {
  const bare = value.startsWith("i-") ? value.slice(2) : value;
  const parts = bare.split(":");
  if (parts.length > 2) return undefined;
  let [prefix, name] = parts;
  if (name === undefined && value.startsWith("i-")) {
    prefix =
      [...prefixes, ...HYPHENATED]
        .sort((a, b) => b.length - a.length)
        .find((known) => bare.startsWith(`${known}-`)) ?? bare.split("-")[0];
    name = bare.slice(prefix.length + 1);
  }
  return prefix && name && PART.test(prefix) && PART.test(name) ? { prefix, name } : undefined;
}

// Each icon's data by API, set, and name, kept across parses and instances, so a site that builds many pages asks
// once per icon. A failed request isn't kept, so the next parse tries again.
const downloaded = new Map<string, Promise<IconifyJSON | undefined>>();

async function download(api: string, prefix: string, names: string[]) {
  const response = await fetch(`${api}/${prefix}.json?icons=${names.join(",")}`, {
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  // For a set it doesn't have, the API answers 200 with the body `404`.
  const set: unknown = JSON.parse(await response.text());
  // SAFETY: an object with `icons` is the API's icon set JSON.
  return set instanceof Object && "icons" in set ? (set as IconifyJSON) : undefined;
}

// Iconify asks for sorted names and URLs under 500 characters, so each set's names go in as few such requests as fit.
function request(api: string, prefix: string, names: string[]) {
  const missing = names.filter((name) => !downloaded.has(`${api}/${prefix}:${name}`)).sort();
  while (missing.length) {
    const batch: string[] = [];
    while (
      missing.length &&
      (!batch.length ||
        `${api}/${prefix}.json?icons=${[...batch, missing[0]].join(",")}`.length < 500)
    )
      batch.push(missing.shift() ?? "");
    const set = download(api, prefix, batch);
    for (const name of batch) {
      const key = `${api}/${prefix}:${name}`;
      downloaded.set(key, set);
      set.catch(() => downloaded.delete(key));
    }
  }
}

const isIconify = (set: IconCollection): set is IconifyJSON =>
  "icons" in set && set.icons instanceof Object;

function draw(name: string, markup: string): IconData {
  // An SVG drawn as an image needs its namespace, which SVG written inline in HTML often leaves out.
  const svg = /^\s*<svg\b(?![^>]*\bxmlns=)/.test(markup)
    ? markup.replace(/<svg\b/, '<svg xmlns="http://www.w3.org/2000/svg"')
    : markup;
  const [, , , width, height] = /viewBox=["']([-\d.]+)[ ,]+([-\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)["']/
    .exec(svg)
    ?.map(Number) ?? [0, 0, 0, 1, 1];
  // A monochrome icon paints with currentColor, so it becomes a mask in the text's color and follows its theme.
  return {
    name,
    src: svgToData(svg.trim()),
    ratio: width && height ? Math.round((width / height) * 1000) / 1000 : 1,
    mask: svg.includes("currentColor"),
  };
}

function fromSet(set: IconCollection, name: string) {
  if (!isIconify(set)) return set[name];
  const data = getIconData(set, name);
  if (!data) return undefined;
  const { attributes, body } = iconToSVG(data);
  return iconToHTML(body, { viewBox: attributes.viewBox });
}

/** Resolves icon names from `collections`, then the Iconify API. Share one between the plugins of a page. */
export function createIcons(options: IconOptions = {}): Icons {
  const collections = options.collections ?? {};
  const api =
    options.fetch === false
      ? undefined
      : options.fetch === true || options.fetch === undefined
        ? API
        : options.fetch.replace(/\/+$/, "");
  return {
    async resolve(values) {
      const unique = [...new Set(values)];
      const parsed = new Map(
        unique.map((value) => [value, parseIconName(value, Object.keys(collections))]),
      );
      if (api) {
        const wanted = new Map<string, string[]>();
        for (const [value, name] of parsed)
          if (name && !LINK.test(value) && !collections[name.prefix])
            wanted.set(name.prefix, [...(wanted.get(name.prefix) ?? []), name.name]);
        for (const [prefix, names] of wanted) request(api, prefix, names);
      }
      const resolve = async (value: string): Promise<IconData | IconProblem> => {
        // A quote, backslash, or space would end the CSS url() the URL goes in.
        if (LINK.test(value))
          return {
            name: value,
            src: value.replace(/["\\\s]/g, encodeURIComponent),
            ratio: 1,
            mask: false,
          };
        const name = parsed.get(value);
        if (!name) return { problem: "name" };
        const local = collections[name.prefix];
        if (local) {
          const svg = fromSet(local, name.name);
          return svg ? draw(`${name.prefix}:${name.name}`, svg) : { problem: "missing" };
        }
        if (!api) return { problem: "set" };
        try {
          const set = await downloaded.get(`${api}/${name.prefix}:${name.name}`);
          if (!set) return { problem: "set" };
          const svg = fromSet(set, name.name);
          return svg ? draw(`${name.prefix}:${name.name}`, svg) : { problem: "missing" };
        } catch (error) {
          return {
            problem: "load",
            reason: error instanceof Error ? error.message : String(error),
          };
        }
      };
      return new Map(
        await Promise.all(unique.map(async (value) => [value, await resolve(value)] as const)),
      );
    },
  };
}

/** The comark-linter rule of an icon problem. */
export type IconRule =
  | "comark/icon/invalid-name"
  | "comark/icon/unknown-set"
  | "comark/icon/unknown-icon"
  | "comark/icon/download-failed";

const RULES = {
  name: "comark/icon/invalid-name",
  set: "comark/icon/unknown-set",
  missing: "comark/icon/unknown-icon",
  load: "comark/icon/download-failed",
} as const satisfies Record<IconProblem["problem"], IconRule>;

/**
 * The rule of the sentence `describeIconProblem` words, for `meta.issueRules`, so every plugin that draws icons reports
 * a problem under the same rule.
 */
export const iconProblemRule = ({ problem }: IconProblem): IconRule => RULES[problem];

/** The sentence for an icon that can't be drawn, with the fix. Plugins put where it is in front. */
export function describeIconProblem(value: string, { problem, reason }: IconProblem): string {
  const name = parseIconName(value);
  if (problem === "name")
    return `"${value}" isn't an icon name. Write it as \`set:name\`, such as \`lucide:apple\`, or give an image URL.`;
  if (!name) return `Iconify has no icon \`${value}\`.`;
  if (problem === "missing")
    return `The \`${name.prefix}\` set has no icon \`${name.name}\`. Find its name at https://icones.js.org/collection/${name.prefix}.`;
  if (problem === "load")
    return `Couldn't load \`${value}\` from Iconify (${reason}). Install \`@iconify-json/${name.prefix}\` and pass it in \`collections\`, or try again.`;
  return `There's no icon set \`${name.prefix}\` to draw \`${value}\` from. Find a set at https://icones.js.org, or pass \`${name.prefix}\` in \`collections\`.`;
}
