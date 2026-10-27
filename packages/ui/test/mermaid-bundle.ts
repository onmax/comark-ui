import { fileURLToPath } from "node:url";
import { compile } from "svelte/compiler";
import { build } from "vite";

/** A browser bundle of the real framework components, without a docs build or external requests. */
export async function mermaidBundle() {
  const result = await build({
    configFile: false,
    logLevel: "error",
    define: { "process.env.NODE_ENV": '"production"' },
    plugins: [
      {
        name: "mermaid-test-svelte",
        transform(source, id) {
          if (id.endsWith(".svelte"))
            return compile(source, { filename: id, generate: "client" }).js;
        },
      },
    ],
    build: {
      write: false,
      minify: false,
      lib: {
        entry: fileURLToPath(new URL("./fixtures/mermaid.ts", import.meta.url)),
        formats: ["iife"],
        name: "MermaidTest",
      },
    },
  });
  const output = (Array.isArray(result) ? result[0]! : result) as {
    output: { type: string; code?: string }[];
  };
  return output.output.find((chunk) => chunk.type === "chunk")!.code!;
}
