import { fileURLToPath } from "node:url";
import { compile } from "svelte/compiler";
import { build } from "vite";

const source = (path: string) => fileURLToPath(new URL(path, import.meta.url));

// Bundles @comark/svelte with this package's Formula, so both share Svelte's internals, for the server or the browser.
export async function svelteBundle(entry: string, generate: "server" | "client") {
  const result = await build({
    configFile: false,
    logLevel: "error",
    resolve: {
      alias: {
        "comark-mathml/client": source("../src/client.ts"),
        "comark-mathml": source("../src/index.ts"),
      },
      conditions: ["svelte", "browser"],
    },
    ssr: { noExternal: true, resolve: { conditions: ["svelte"] } },
    plugins: [
      {
        name: "math-test-svelte",
        transform(code, id) {
          if (id.endsWith(".svelte")) return compile(code, { filename: id, generate }).js;
        },
      },
    ],
    build: {
      write: false,
      minify: false,
      ...(generate === "server"
        ? { ssr: source(entry), rollupOptions: { output: { format: "es" as const } } }
        : { lib: { entry: source(entry), formats: ["iife" as const], name: "fixture" } }),
    },
  });
  const output = (Array.isArray(result) ? result[0]! : result) as {
    output: { type: string; code?: string }[];
  };
  return output.output.find((chunk) => chunk.type === "chunk")!.code!;
}
