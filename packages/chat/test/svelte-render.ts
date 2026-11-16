import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { UIMessage } from "ai";
import { compile } from "svelte/compiler";
import { build } from "vite";

const source = (path: string) => fileURLToPath(new URL(path, import.meta.url));

type Render = (parts: UIMessage["parts"]) => string;
let renderer: Promise<Render> | undefined;

// Bundles the Svelte components with svelte/server into one file, so both share Svelte's internals.
async function bundle(): Promise<Render> {
  const result = await build({
    configFile: false,
    logLevel: "error",
    resolve: {
      alias: {
        "comark-chat/client": source("../src/client.ts"),
        "comark-chat": source("../src/index.ts"),
      },
    },
    ssr: { noExternal: true, resolve: { conditions: ["svelte"] } },
    plugins: [
      {
        name: "chat-test-svelte",
        transform(code, id) {
          if (id.endsWith(".svelte")) return compile(code, { filename: id, generate: "server" }).js;
        },
      },
    ],
    build: {
      write: false,
      minify: false,
      ssr: source("./fixtures/svelte.ts"),
      rollupOptions: { output: { format: "es" } },
    },
  });
  const output = (Array.isArray(result) ? result[0]! : result) as {
    output: { type: string; code?: string }[];
  };
  const dir = await mkdtemp(join(tmpdir(), "comark-chat-svelte-"));
  const file = join(dir, "render.mjs");
  await writeFile(file, output.output.find((chunk) => chunk.type === "chunk")!.code!);
  try {
    return ((await import(/* @vite-ignore */ pathToFileURL(file).href)) as { render: Render })
      .render;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/** Server-renders the Svelte `MessageParts` for these parts. */
export async function svelte(parts: UIMessage["parts"]) {
  renderer ??= bundle();
  return (await renderer)(parts);
}
