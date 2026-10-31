import { fileURLToPath } from "node:url";
import { compile } from "svelte/compiler";
import { build } from "vite";

export async function propertiesBundle() {
  const result = await build({
    configFile: false,
    logLevel: "error",
    define: { "process.env.NODE_ENV": '"production"' },
    resolve: {
      alias: {
        "comark-properties/client": fileURLToPath(new URL("../src/client.ts", import.meta.url)),
      },
    },
    plugins: [
      {
        name: "properties-test-svelte",
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
        entry: fileURLToPath(new URL("./fixtures/properties.ts", import.meta.url)),
        formats: ["iife"],
        name: "PropertiesTest",
      },
    },
  });
  const output = (Array.isArray(result) ? result[0]! : result) as {
    output: { type: string; code?: string }[];
  };
  return output.output.find((chunk) => chunk.type === "chunk")!.code!;
}
