import type { RuleContext } from "vite-doctor/extension";
import {
  createRule,
  defineDoctorDiagnostics,
  defineDoctorExtension,
  defineRulePack,
} from "vite-doctor/extension";
import { lintFiles, resolveConfig, type Config, type LintedFile, type Rule } from "./index.ts";
import { catalog, type RuleInfo } from "./rules/index.ts";

export type DoctorOptions = Config & {
  /** Markdown to check, relative to the project root. Default `**\/*.{md,mdc}`. */
  include?: string;
  /** Globs to skip. Default `node_modules` and `dist`. */
  exclude?: readonly string[];
};

// SAFETY: built from every entry of the catalog, whose keys are exactly the rules.
const ids = Object.keys(catalog) as Rule[];
const info: Record<Rule, RuleInfo> = catalog;
const ruleOf = new Map<string, Rule>(ids.map((id) => [info[id].code, id]));

const diagnostics = defineDoctorDiagnostics(
  ids.map((ruleId) => ({ code: info[ruleId].code, ruleId })),
  {
    docsBase: (code) => {
      const rule = ruleOf.get(code);
      return rule && `https://comark-ui.onmax.me/doctor/${rule.replace(/^comark\//, "")}/`;
    },
  },
);

/**
 * A Doctor Extension that lints the project's Markdown with lint-comark. Register it in
 * `doctor.config.ts` and run `vite-doctor . --config doctor.config.ts`.
 */
export default function comark(options: DoctorOptions = {}) {
  const {
    include = "**/*.{md,mdc}",
    exclude = ["**/node_modules/**", "**/dist/**"],
    ...config
  } = options;

  // Every Rule reads the same results; the first one to run lints the files. Rules may only read through `ctx.fs`,
  // so links are checked through it too. The URL cache is written with node:fs, since `ctx.fs` can't write.
  const lintProject = (ctx: RuleContext) => {
    const key = `lint-comark:${ctx.project.root}`;
    let results = ctx.cache.get<Promise<LintedFile[]>>(key);
    if (!results) {
      results = resolveConfig(config).then((resolved) =>
        lintFiles(ctx.fs.glob(include, { exclude }), {
          ...resolved,
          root: ctx.project.root,
          read: (path) => ctx.fs.readText(path),
          exists: (path) => ctx.fs.exists(path),
          list: (path) => ctx.fs.readDir(path)?.map((entry) => entry.name),
        }),
      );
      ctx.cache.set(key, results);
    }
    return results;
  };

  const doctorRules = ids.map((id) =>
    createRule({
      meta: {
        id,
        title: info[id].title,
        category: "content",
        severity: info[id].severity ?? "warn",
        execution: "manifest",
        // The result depends on the comark plugins installed, which the Rule imports instead of reading.
        cacheScope: "none",
        ...(id === "comark/dead-url" && { determinism: "env-dependent" as const }),
      },
      create(ctx) {
        return {
          async onProjectEnd() {
            for (const { file, text = "", diagnostics: found } of await lintProject(ctx)) {
              const starts = [0];
              for (const match of text.matchAll(/\r\n?|\n/g))
                starts.push(match.index + match[0].length);
              for (const diagnostic of found) {
                if (diagnostic.rule !== id) continue;
                const start = (starts[diagnostic.line - 1] ?? 0) + (diagnostic.column ?? 1) - 1;
                ctx.report(
                  diagnostics.diagnostics[info[id].code]({
                    why: diagnostic.message,
                    fix: diagnostic.fix,
                    sources: [`${file}:${diagnostic.line}:${diagnostic.column ?? 1}`],
                    cause: diagnostic.cause,
                  }),
                  {
                    file,
                    range: {
                      start,
                      end: start,
                      line: diagnostic.line,
                      column: diagnostic.column ?? 1,
                    },
                  },
                );
              }
            }
          },
        };
      },
    }),
  );

  return defineDoctorExtension({
    name: "comark",
    rulePacks: [
      defineRulePack({
        name: "comark",
        version: "1.0.0",
        rules: doctorRules,
        diagnostics,
        presets: { recommended: ids },
      }),
    ],
  });
}
