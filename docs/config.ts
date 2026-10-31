// The playground's Config tab: each package's options as JSON, keyed by its npm name. Only the packages that take
// options are listed; the build writes this text into the tab and the playground reads every edit of it.
import type { CodeOptions } from "../packages/code/src/index.ts";
import type { CalloutsOptions, ReferencesOptions } from "../packages/github/src/index.ts";
import type { AnchorsOptions, ExternalOptions } from "../packages/links/src/index.ts";
import type { ZoomOptions } from "../packages/zoom/src/index.ts";
import { errorText } from "../shared/text.ts";

export interface PlayConfig {
  "comark-code"?: CodeOptions;
  "comark-github"?: { callouts?: CalloutsOptions; references?: ReferencesOptions };
  "comark-links"?: { external?: ExternalOptions; anchors?: AnchorsOptions };
  "comark-zoom"?: ZoomOptions;
}

const defaults: Required<PlayConfig> = {
  "comark-code": { actions: [] },
  "comark-github": {
    callouts: {
      titles: {
        note: "Note",
        tip: "Tip",
        important: "Important",
        warning: "Warning",
        caution: "Caution",
      },
    },
    references: { repo: "onmax/comark-ui" },
  },
  "comark-links": {
    external: { target: false, rel: [], hosts: [] },
    anchors: { levels: [2, 3, 4] },
  },
  "comark-zoom": { images: true },
};
const names = Object.keys(defaults);

export const defaultConfig = `${JSON.stringify(defaults, null, 2)}\n`;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

// A config that can't be read renders with no options at all, and says why in the issues.
export function readConfig(text: string): { config: PlayConfig; issues: string[] } {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch (error) {
    const reason = errorText(error);
    return {
      config: {},
      issues: [`The config isn't valid JSON (${reason}); fix it or empty it to {}.`],
    };
  }
  if (!isObject(value))
    return { config: {}, issues: ["The config must be a JSON object keyed by package name."] };
  const issues: string[] = [];
  const config: Record<string, unknown> = {};
  for (const [name, options] of Object.entries(value)) {
    if (!names.includes(name))
      issues.push(
        `The config's "${name}" isn't a package with options; use ${names.map((n) => `"${n}"`).join(" or ")}.`,
      );
    else if (!isObject(options))
      issues.push(`The config's "${name}" must be an object of its options.`);
    else config[name] = options;
  }
  return { config, issues };
}
