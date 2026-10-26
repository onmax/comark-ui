import { isAbsolute, resolve } from "node:path";
import {
  MessageChannel,
  receiveMessageOnPort,
  Worker,
  type MessagePort,
} from "node:worker_threads";
import markdown from "@eslint/markdown";
import type { ESLint, Linter, Rule as RuleModule } from "eslint";
import pkg from "../package.json" with { type: "json" };
import type { Diagnostic, Rule } from "./index.ts";
import { catalog, type RuleInfo } from "./rules/index.ts";

/** `settings.comark` in an ESLint config. */
export type Settings = {
  /** A `lint-comark.config.mjs`, from the working directory, whose plugins and components are added to the installed comark-ui packages. */
  config?: string;
};

export type Request = { text: string; file?: string; root: string; config?: string; urls: boolean };
export type Reply = { diagnostics: Omit<Diagnostic, "cause">[] } | { error: string };

// SAFETY: built from every entry of the catalog, whose keys are exactly the rules.
const ids = Object.keys(catalog) as Rule[];
const info: Record<Rule, RuleInfo> = catalog;

// Long enough for the first file to load every comark-ui package, and for `comark/dead-url` to request a page's URLs.
const TIMEOUT = 60_000;
const URLS_TIMEOUT = 300_000;

let channel: { worker: Worker; port: MessagePort; signal: Int32Array } | undefined;

// ESLint rules are synchronous and `lint()` isn't, so it runs in a worker while this thread waits for its reply.
function call(request: Request): Reply {
  if (!channel) {
    const { port1, port2 } = new MessageChannel();
    const signal = new Int32Array(new SharedArrayBuffer(4));
    const worker = new Worker(new URL("./eslint-worker.mjs", import.meta.url), {
      workerData: { port: port2, signal },
      transferList: [port2],
    });
    worker.unref();
    channel = { worker, port: port1, signal };
  }
  const { worker, port, signal } = channel;
  Atomics.store(signal, 0, 0);
  port.postMessage(request);
  const waited = Atomics.wait(signal, 0, 0, request.urls ? URLS_TIMEOUT : TIMEOUT);
  // SAFETY: the worker posts only replies.
  const reply = receiveMessageOnPort(port)?.message as Reply | undefined;
  if (reply) return reply;
  // A worker that didn't answer may still answer later, so the next file gets a new one.
  void worker.terminate();
  channel = undefined;
  return {
    error:
      waited === "timed-out"
        ? `it gave no answer in ${(request.urls ? URLS_TIMEOUT : TIMEOUT) / 1000} seconds`
        : "its worker stopped",
  };
}

// Every rule reads one result per file, and `comark/dead-url` its own, since only it requests URLs.
const results = new WeakMap<object, Map<boolean, Omit<Diagnostic, "cause">[]>>();

function diagnosticsOf(context: RuleModule.RuleContext, urls: boolean) {
  const { sourceCode } = context;
  let byUrls = results.get(sourceCode);
  if (!byUrls) results.set(sourceCode, (byUrls = new Map()));
  let found = byUrls.get(urls);
  if (!found) {
    // SAFETY: `settings.comark` belongs to this plugin, and Settings is the shape its docs give.
    const { config } = (context.settings.comark ?? {}) as Settings;
    const file = context.physicalFilename;
    const reply = call({
      text: sourceCode.text,
      file: isAbsolute(file) ? file : undefined,
      root: context.cwd,
      config: config && resolve(context.cwd, config),
      urls,
    });
    found =
      "error" in reply
        ? [
            {
              rule: "comark/plugin-issue",
              line: 1,
              message: `lint-comark could not check this document: ${reply.error}.`,
              fix: config
                ? `Check that \`${config}\` in \`settings.comark.config\` loads, and that its plugins don't throw.`
                : "Report this with the document at https://github.com/onmax/comark-ui/issues.",
            },
          ]
        : reply.diagnostics;
    byUrls.set(urls, found);
  }
  return found;
}

const rules = Object.fromEntries(
  ids.map((id): [string, RuleModule.RuleModule] => [
    id.replace(/^comark\//, ""),
    {
      meta: {
        type: "problem",
        docs: {
          description: info[id].title,
          url: `https://comark-ui.onmax.me/doctor/${id.replace(/^comark\//, "")}/`,
        },
        schema: [],
      },
      create(context) {
        const lines = context.sourceCode.text.split(/\r\n?|\n/).length;
        for (const { rule, line, column, message, fix } of diagnosticsOf(
          context,
          id === "comark/dead-url",
        ))
          if (rule === id)
            context.report({
              // Markdown counts columns from 1, like lint-comark.
              loc: { line: Math.min(Math.max(line, 1), lines), column: column ?? 1 },
              message: `${message} ${fix}`,
            });
        return {};
      },
    },
  ]),
);

export type Plugin = ESLint.Plugin & {
  rules: Record<string, RuleModule.RuleModule>;
  configs: { recommended: Linter.Config };
};

/** An ESLint plugin with every lint-comark rule, for Markdown parsed by `@eslint/markdown`. */
const plugin: Plugin = {
  meta: { name: pkg.name, version: pkg.version },
  rules,
  // SAFETY: recommended is set below, before the plugin is exported, since it registers the plugin itself.
  configs: {} as Plugin["configs"],
};

/**
 * Lints `.md` and `.mdc` files as Markdown with every lint-comark rule, except `comark/dead-url`, which requests URLs.
 * Each rule keeps the severity its Doctor page gives it.
 */
plugin.configs.recommended = {
  name: "comark/recommended",
  files: ["**/*.md", "**/*.mdc"],
  plugins: { markdown, comark: plugin },
  language: "markdown/commonmark",
  languageOptions: { frontmatter: "yaml" },
  rules: Object.fromEntries(
    ids
      .filter((id) => id !== "comark/dead-url")
      .map((id) => [id, info[id].severity ?? "warn"] as const),
  ),
};

export default plugin;
