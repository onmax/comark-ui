import { defineDiagnostics } from "nostics";
import { uiDocs } from "./map.ts";

const SKILL =
  "Agents: the comark-ui skill (`npx skills add onmax/comark-ui`) covers Comark's blocks and plugins.";
const DOCS = "https://comark-ui.onmax.me/remark-to-comark/diagnostics";

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
  RTC0101: {
    ruleId: "remark-to-comark/framework",
    severity: "warn",
    why: (p: Where & { host: string }) =>
      `${p.host} owns the remark setup at ${p.at}, so the rewrite reports its plugins and leaves the code as it is.`,
    fix: (p: Where & { host: string }) =>
      p.host === "react-markdown"
        ? `Replace the react-markdown component with \`<Markdown value={markdown} options={…} plugins={[…]} />\` from @comark/react (Vue: @comark/vue), passing the Comark plugins the findings below name. ${SKILL}`
        : p.host === "A component"
          ? `Find out which renderer this component wraps; if it's remark-based, render with Comark's component for your framework (@comark/react, @comark/vue, @comark/svelte) and the plugins the findings below name. ${SKILL}`
          : `Render the Markdown yourself where the framework allows it (a content loader or route) with \`renderHtml(markdown, comarkOptions())\`, or keep remark for this site; the plugin findings below say what each plugin becomes. ${SKILL}`,
  },
  RTC0102: {
    ruleId: "remark-to-comark/plugin",
    severity: "info",
    why: (p: Plugin & { ui: string }) =>
      `${p.plugin} (${p.at}) has a comark-ui counterpart: ${p.ui} (${uiDocs(p.ui)}).`,
    fix: (p: Plugin & { ui: string; port?: string; comark?: string }) =>
      `Install ${p.ui} and register it as its docs say; its markup differs from ${p.plugin}'s, so check pages that style it.${
        p.port
          ? ` For output identical to ${p.plugin}, use ${p.port} from remark-to-comark/plugins instead, tested against it.`
          : p.comark
            ? ` Comark's own ${p.comark} also does the job.`
            : ""
      } ${SKILL}`,
  },
  RTC0103: {
    ruleId: "remark-to-comark/plugin",
    severity: "info",
    why: (p: Plugin & { how: string }) => `${p.plugin} (${p.at}) is covered: ${p.how}`,
    fix: (p: Plugin & { owned?: boolean }) =>
      p.owned
        ? "Nothing to rewrite here, since the setup isn't rewritten; when you move it to Comark, use what the line above names."
        : "Nothing to do; the rewrite handles it.",
  },
  RTC0104: {
    ruleId: "remark-to-comark/plugin",
    severity: "info",
    why: (p: Plugin & { port: string }) =>
      `${p.plugin} (${p.at}) becomes ${p.port} from remark-to-comark/plugins, tested against the original plugin.`,
    fix: (p: Plugin & { port: string }) =>
      `Register \`${p.port}\` where ${p.plugin} was; options carry over.`,
  },
  RTC0105: {
    ruleId: "remark-to-comark/custom-plugin",
    severity: "warn",
    why: (p: Plugin) =>
      `${p.plugin} (${p.at}) is the project's own plugin, or an expression the scan can't follow, so nothing replaces it.`,
    fix: () =>
      `Port it to a Comark plugin (a \`post\` hook over \`state.tree\`, see the ports in remark-to-comark/plugins), then run \`remark-to-comark lab\` on the project's content to prove it renders the same. ${SKILL}`,
  },
  RTC0106: {
    ruleId: "remark-to-comark/unsupported-plugin",
    severity: "warn",
    why: (p: Plugin & { note: string }) =>
      `${p.plugin} (${p.at}) has no Comark counterpart: ${p.note}`,
    fix: () =>
      "Keep what it does outside the parser, as the note says, or port it and check it with `remark-to-comark lab`.",
  },
  RTC0107: {
    ruleId: "remark-to-comark/plugin",
    severity: "info",
    why: (p: Plugin) => `${p.plugin} (${p.at}) lints Markdown instead of rendering it.`,
    fix: () =>
      `Lint Comark documents with comark-linter, as a CLI or a Vite Doctor extension (${uiDocs("comark-lint")}).`,
  },
  RTC0201: {
    ruleId: "remark-to-comark/chain",
    severity: "warn",
    why: (p: Where & { reason: string }) =>
      `The unified chain at ${p.at} can't be rewritten without changing what it does (${p.reason}).`,
    fix: (p: Where & { reason: string }) =>
      /counterpart|own plugin/.test(p.reason)
        ? "Port or drop those plugins first (their RTC0105 and RTC0106 findings say how), then run `remark-to-comark rewrite` again."
        : /ends in `(parse|run|use)`/.test(p.reason)
          ? "This pipeline works on the syntax tree, not on HTML, so `renderHtml()` can't replace it. Keep remark for this step, or port the tree code to Comark's nodes (`parseMarkdown()` from comark returns them)."
          : /HTML options/.test(p.reason)
            ? "Write `allowDangerousHtml` (or remark-html's `sanitize`) as a literal in the chain, so the rewrite can keep the same HTML policy, then run it again."
            : "Change the call by hand so it passes the Markdown string and uses the returned HTML string, then run `remark-to-comark rewrite` again.",
  },
  RTC0202: {
    ruleId: "remark-to-comark/rewritable-chain",
    severity: "info",
    why: (p: Where) =>
      `The unified chain at ${p.at} can become \`renderHtml(markdown, comarkOptions(…))\`.`,
    fix: () =>
      "Run `remark-to-comark rewrite <dir> --write`, then install @comark/html and the imports it adds.",
  },
  RTC0301: {
    ruleId: "remark-to-comark/mdx",
    severity: "warn",
    why: (p: Where & { count: number; docusaurus?: number; unresolved?: number }) =>
      `${p.count} MDX ${p.count === 1 ? "file is" : "files are"} left as they are (${p.at}): JSX and expressions need a JavaScript runtime that Comark doesn't have.${p.docusaurus ? ` ${p.docusaurus} of them are .md files Docusaurus compiles as MDX, because its config doesn't set \`markdown.format: "detect"\`.` : ""}${p.unresolved ? ` For ${p.unresolved}, \`markdown.format\` isn't a literal the check can read, so they're treated as MDX.` : ""}`,
    fix: (p: Where & { count: number; docusaurus?: number }) =>
      `${p.docusaurus ? 'For the Docusaurus .md files, set `markdown: { format: "detect" }` if they hold no JSX, check the site still builds, and run the check again. ' : ""}To convert a file by hand, rename it to .md, run \`remark-to-comark content\` on it while it still holds only prose, then turn JSX that only passes props into Comark components (\`::name{prop="x"}\`); content escapes Comark syntax, so don't run it after adding components. Keep MDX for pages that run code. ${SKILL}`,
  },
  RTC0302: {
    ruleId: "remark-to-comark/content",
    severity: "warn",
    why: (p: Where & { count: number; lines: string }) =>
      `${p.at} has ${p.count} ${p.count === 1 ? "spot" : "spots"} Comark would read differently from remark, on lines ${p.lines}.`,
    fix: (p: Where & { missing?: string }) =>
      p.missing
        ? `Install the project's dependencies first: ${p.missing} couldn't be loaded, and without it the rewrite would escape the syntax it adds. Then run \`remark-to-comark content "${p.at.replace(/:\d+$/, "")}" --write\`.`
        : `Run \`remark-to-comark content "${p.at.replace(/:\d+$/, "")}" --write\`; remark renders the rewritten file exactly as before.`,
  },
  RTC0303: {
    ruleId: "remark-to-comark/content",
    severity: "warn",
    why: (p: Where & { count: number; lines: string }) =>
      `${p.at} has ${p.count} ${p.count === 1 ? "block" : "blocks"} the rewrite left as written, on lines ${p.lines}: a URL follows an unclosed \`[\`, and escaping that \`[\` would change where remark ends the link. Comark may read the bracket as a span there.`,
    fix: () =>
      "Where the bracket is plain text, escape it by hand (`\\[`) or wrap the URL in `<…>` so both parsers see an autolink, then run the check again.",
  },
} as const;

export type Code = keyof typeof catalog;

export const diagnostics = defineDiagnostics({
  docsBase: (code) => `${DOCS}#${String(code).toLowerCase()}`,
  codes: catalog,
});
