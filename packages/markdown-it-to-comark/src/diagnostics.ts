import { defineDiagnostics } from "nostics";
import { uiDocs } from "./map.ts";

const SKILL =
  "Agents: the comark-ui skill (`npx skills add onmax/comark-ui`) covers Comark's blocks and plugins.";
const DOCS = "https://comark-ui.onmax.me/markdown-it-to-comark/diagnostics";

interface Where {
  /** `file:line`, for the sentence. */
  at: string;
}
interface Plugin extends Where {
  plugin: string;
}

/**
 * Every finding the migration reports, as nostics codes: one sentence on what was found, one on what to do, and a
 * docs link. The CLI prints them and the Vite Doctor extension reports them, so agents get the same text either way.
 */
export const catalog = {
  MIC0101: {
    ruleId: "markdown-it-to-comark/framework",
    severity: "warn",
    why: (p: Where & { host: string }) =>
      `${p.host} owns the markdown-it instance at ${p.at}, so the rewrite reports its plugins and leaves the code as it is.`,
    fix: (p: Where & { host: string }) =>
      p.host === "The caller of this function"
        ? `Find where this function gets its markdown-it instance; when that code moves to Comark, register the same plugins with \`markdownItPlugin()\` from markdown-it-to-comark/plugins in \`comarkOptions({ plugins })\`. ${SKILL}`
        : `Render the Markdown yourself where ${p.host} allows it (a content loader or route) with \`renderHtml(markdown, comarkOptions())\`, or keep markdown-it for this site; the plugin findings below say what each plugin becomes. ${SKILL}`,
  },
  MIC0102: {
    ruleId: "markdown-it-to-comark/plugin",
    severity: "info",
    why: (p: Plugin & { ui: string }) =>
      `${p.plugin} (${p.at}) has a comark-ui counterpart: ${p.ui} (${uiDocs(p.ui)}).`,
    fix: (p: Plugin & { ui: string; bridged?: boolean }) =>
      `${p.bridged ? `For output identical to ${p.plugin}, register it with \`markdownItPlugin()\` from markdown-it-to-comark/plugins; the rewrite does that. ` : ""}For Comark's own blocks, styled and themed, install ${p.ui} instead; its markup differs, so check pages that style it. ${SKILL}`,
  },
  MIC0103: {
    ruleId: "markdown-it-to-comark/plugin",
    severity: "info",
    why: (p: Plugin & { how: string }) => `${p.plugin} (${p.at}) is covered: ${p.how}`,
    fix: (p: Plugin & { owned?: boolean }) =>
      p.owned
        ? "Nothing to rewrite here, since the setup isn't rewritten; when you move it to Comark, use what the line above names."
        : "Nothing to do; the rewrite handles it.",
  },
  MIC0104: {
    ruleId: "markdown-it-to-comark/plugin",
    severity: "info",
    why: (p: Plugin & { note?: string }) =>
      `${p.plugin} (${p.at}) runs on Comark through \`markdownItPlugin()\`, renderer rules included; its output was compared with markdown-it's on real projects.${p.note ? ` ${p.note}` : ""}`,
    fix: (p: Plugin) =>
      `Register \`markdownItPlugin(${p.plugin.replace(/\W+(\w)/g, (_, c: string) => c.toUpperCase()).replace(/^\W+/, "")}, …options)\` from markdown-it-to-comark/plugins in \`comarkOptions({ plugins })\`; the rewrite does it for setups it replaces.`,
  },
  MIC0105: {
    ruleId: "markdown-it-to-comark/custom-plugin",
    severity: "warn",
    why: (p: Plugin & { by?: string; tested?: boolean }) =>
      p.by === "hand"
        ? `${p.plugin} (${p.at}) changes the markdown-it instance by hand, which no Comark option replaces.`
        : p.tested === false
          ? `${p.plugin} (${p.at}) isn't in the plugin map, so its output on Comark hasn't been compared.`
          : `${p.plugin} (${p.at}) is the project's own plugin, or an expression the scan can't follow.`,
    fix: (p: Plugin & { by?: string }) =>
      p.by === "hand"
        ? `Move the change into a plugin function (\`(md) => { … }\`) and register it with \`markdownItPlugin()\` from markdown-it-to-comark/plugins, which runs renderer rules too; then compare a few pages with markdown-it's output. ${SKILL}`
        : `Register it with \`markdownItPlugin()\` from markdown-it-to-comark/plugins, which runs its parser and renderer rules on Comark, then compare a few of the project's pages with markdown-it's output before relying on it. ${SKILL}`,
  },
  MIC0106: {
    ruleId: "markdown-it-to-comark/unsupported-plugin",
    severity: "warn",
    why: (p: Plugin & { note: string }) =>
      `${p.plugin} (${p.at}) has no Comark counterpart: ${p.note}`,
    fix: () =>
      "Keep what it does outside the parser, as the note says, or port it and compare its output with markdown-it's on the project's pages.",
  },
  MIC0107: {
    ruleId: "markdown-it-to-comark/option",
    severity: "warn",
    why: (p: Where & { option: string; reason: string }) =>
      `The \`${p.option}\` option at ${p.at} doesn't carry over as written: ${p.reason}.`,
    fix: (p: Where & { option: string }) =>
      p.option === "highlight"
        ? "Wrap the fence rule in a plugin, `(md) => md.set({ highlight })`, and register it with `markdownItPlugin()`, or use Comark's Shiki `highlight()` from `comark/plugins/highlight`. Then run the rewrite again."
        : `Write \`${p.option}\` as a literal, or drop it if the output doesn't depend on it, then run the check again.`,
  },
  MIC0201: {
    ruleId: "markdown-it-to-comark/setup",
    severity: "warn",
    why: (p: Where & { reason: string }) =>
      `The markdown-it setup at ${p.at} can't be rewritten without changing what it does: it ${p.reason}.`,
    fix: (p: Where & { reason: string }) =>
      /async function|promise/.test(p.reason)
        ? "Comark renders asynchronously. Make the function that calls `render` async and await its result where it's called, or keep markdown-it here; then run `markdown-it-to-comark rewrite` again."
        : /compared|by hand|plugin/.test(p.reason)
          ? "Register those plugins with `markdownItPlugin()` by hand (MIC0105 says how) and compare a few pages, or keep markdown-it for this setup."
          : "Change the code as the reason says, then run `markdown-it-to-comark rewrite` again, or keep markdown-it for this setup.",
  },
  MIC0202: {
    ruleId: "markdown-it-to-comark/rewritable-setup",
    severity: "info",
    why: (p: Where) =>
      `The markdown-it setup at ${p.at} can become \`await renderHtml(markdown, comarkOptions(…))\`.`,
    fix: () =>
      "Run `markdown-it-to-comark rewrite <dir> --write`, then install @comark/html, comark, and markdown-it-to-comark as dependencies; the plugins stay as they are.",
  },
  MIC0302: {
    ruleId: "markdown-it-to-comark/content",
    severity: "warn",
    why: (p: Where & { count: number; lines: string }) =>
      `${p.at} has ${p.count} ${p.count === 1 ? "spot" : "spots"} Comark would read differently from markdown-it, on lines ${p.lines}.`,
    fix: (p: Where & { missing?: string }) =>
      p.missing
        ? `Install the project's dependencies first: ${p.missing} couldn't be loaded, and without it the rewrite would escape the syntax it adds. Then run \`markdown-it-to-comark content "${p.at.replace(/:\d+$/, "")}" --write\`.`
        : `Run \`markdown-it-to-comark content "${p.at.replace(/:\d+$/, "")}" --write\`; markdown-it renders the rewritten file exactly as before.`,
  },
  MIC0303: {
    ruleId: "markdown-it-to-comark/content",
    severity: "warn",
    why: (p: Where & { count: number; lines: string }) =>
      `${p.at} has ${p.count} ${p.count === 1 ? "block" : "blocks"} the rewrite left as written, on lines ${p.lines}, because no edit kept markdown-it's output the same. Comark may read ${p.count === 1 ? "it" : "them"} differently.`,
    fix: () =>
      "Look at each line: escape a `[`, `{`, or `:name` Comark would read as syntax by hand (`\\[`), check markdown-it still renders the page the same, and run the check again.",
  },
} as const;

export type Code = keyof typeof catalog;

export const diagnostics = defineDiagnostics({
  docsBase: (code) => `${DOCS}#${String(code).toLowerCase()}`,
  codes: catalog,
});
