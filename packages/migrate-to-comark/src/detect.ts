import { readFileSync } from "node:fs";
import { join } from "node:path";
import { glob } from "tinyglobby";

export type Library = "remark" | "markdown-it" | "marked";

/** A Markdown library the project declares, and every package.json dependency that brought it in. */
export interface Detection {
  library: Library;
  /** The npm package that moves this library's projects to Comark. */
  migrator: string;
  uses: Use[];
}

/** A Markdown library with no migrator, so the wizard can say so instead of staying silent. */
export interface Unsupported {
  name: string;
  uses: Use[];
}

export interface Use {
  /** The package.json that declares it, relative to the root. */
  manifest: string;
  dependency: string;
  version: string;
}

export interface Detected {
  libraries: Detection[];
  unsupported: Unsupported[];
  /** Whether a package.json already declares comark. */
  comark: boolean;
}

// Frameworks count when they render Markdown with the library themselves, so their content moves with it.
const LIBRARIES: { library: Library; migrator: string; match: RegExp }[] = [
  {
    library: "remark",
    migrator: "remark-to-comark",
    match:
      /^(unified|remark|remark-.+|rehype|rehype-.+|mdast-.+|react-markdown|streamdown|@mdx-js\/.+|astro|@astrojs\/(markdown-remark|mdx)|@docusaurus\/core|gatsby-transformer-remark|nextra|fumadocs-core|@nuxt\/content|contentlayer2?|velite)$/,
  },
  {
    library: "markdown-it",
    migrator: "markdown-it-to-comark",
    match:
      /^(markdown-it|markdown-it-.+|@mdit\/.+|@mdit-vue\/.+|vitepress|vuepress|@vuepress\/.+|@slidev\/cli|@11ty\/eleventy|hexo-renderer-markdown-it|@marp-team\/marp-core|vue-markdown-render)$/,
  },
  {
    library: "marked",
    migrator: "marked-to-comark",
    match: /^(marked|marked-.+|svelte-markdown|ngx-markdown)$/,
  },
];

const UNSUPPORTED = new Set([
  "showdown",
  "@markdoc/markdoc",
  "markdown-to-jsx",
  "commonmark",
  "snarkdown",
  "markdown-wasm",
]);

const FIELDS = ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"];

/** The Markdown libraries every package.json under `root` declares, skipping installed and built files. */
export async function detect(root: string): Promise<Detected> {
  const manifests = (
    await glob("**/package.json", {
      cwd: root,
      ignore: ["**/node_modules/**", "**/dist/**", "**/.output/**", "**/.nuxt/**", "**/.next/**"],
    })
  ).sort();
  const found = new Map<Library, Use[]>();
  const unsupported = new Map<string, Use[]>();
  let comark = false;
  for (const manifest of manifests) {
    let json: Record<string, Record<string, string> | undefined>;
    try {
      json = JSON.parse(readFileSync(join(root, manifest), "utf8"));
    } catch {
      continue;
    }
    for (const field of FIELDS) {
      for (const [dependency, version] of Object.entries(json[field] ?? {})) {
        const use = { manifest, dependency, version: String(version) };
        if (dependency === "comark") comark = true;
        if (UNSUPPORTED.has(dependency))
          unsupported.set(dependency, [...(unsupported.get(dependency) ?? []), use]);
        for (const { library, match } of LIBRARIES)
          if (match.test(dependency)) found.set(library, [...(found.get(library) ?? []), use]);
      }
    }
  }
  return {
    libraries: LIBRARIES.flatMap(({ library, migrator }) => {
      const uses = found.get(library);
      return uses ? [{ library, migrator, uses }] : [];
    }),
    unsupported: [...unsupported].map(([name, uses]) => ({ name, uses })),
    comark,
  };
}
