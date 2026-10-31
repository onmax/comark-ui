import { pathToFileURL } from "node:url";
import { workerData, type MessagePort } from "node:worker_threads";
import { lint, resolveConfig, type Config } from "./index.ts";
import type { Reply, Request } from "./eslint.ts";
import { errorText } from "../../../shared/text.ts";

// SAFETY: eslint.ts starts this worker with exactly this data.
const { port, signal } = workerData as { port: MessagePort; signal: Int32Array };

// Each config is loaded once, with the comark-ui packages installed, for every file ESLint lints.
const configs = new Map<string, Promise<Config>>();
const load = (path = "") => {
  let config = configs.get(path);
  if (!config) {
    config = (async () => {
      if (!path) return resolveConfig();
      // SAFETY: a config module's default export is the object defineConfig returns.
      const module = (await import(pathToFileURL(path).href)) as { default?: Config };
      return resolveConfig(module.default ?? {});
    })();
    configs.set(path, config);
  }
  return config;
};

port.on("message", async ({ text, file, root, config, urls }: Request) => {
  let reply: Reply;
  try {
    const options = await load(config);
    const found = await lint(text, {
      ...options,
      file,
      root,
      links: { ...options.links, urls: urls && (options.links?.urls || true) },
    });
    // An exception can hold what a message can't carry, such as functions.
    reply = {
      diagnostics: found.map(({ rule, line, column, message, fix }) => ({
        rule,
        line,
        column,
        message,
        fix,
      })),
    };
  } catch (error) {
    configs.delete(config ?? "");
    reply = { error: errorText(error) };
  }
  port.postMessage(reply);
  Atomics.store(signal, 0, 1);
  Atomics.notify(signal, 0);
});
