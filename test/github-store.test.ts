import { createHash } from "node:crypto";
import { createGitHubWorkspaceStore } from "@vite-hub/workspace/internal/stores/github";
import { afterEach, expect, it, vi } from "vite-plus/test";

const files: Record<string, string> = { "a.md": "# A", "b.md": "# B", "c.md": "# C" };
const sha = (path: string) => {
  const text = files[path]!;
  return createHash("sha1")
    .update(`blob ${Buffer.byteLength(text)}\0`)
    .update(text)
    .digest("hex");
};
const json = (body: unknown) =>
  new Response(JSON.stringify(body), { headers: { "content-type": "application/json" } });

function fakeGitHub() {
  const blobs: string[] = [];
  vi.stubGlobal("fetch", async (input: string | URL | Request) => {
    const { pathname } = new URL(input instanceof Request ? input.url : input);
    if (pathname.startsWith("/repos/o/r/commits/")) return json({ sha: "c".repeat(40) });
    if (pathname.startsWith("/repos/o/r/git/trees/")) {
      return json({
        truncated: false,
        tree: Object.entries(files).map(([path, text]) => ({
          path,
          mode: "100644",
          type: "blob",
          sha: sha(path),
          size: text.length,
        })),
      });
    }
    const blob = /\/git\/blobs\/(\w+)$/.exec(pathname)?.[1];
    const path = Object.keys(files).find((file) => sha(file) === blob);
    if (!blob || !path) return new Response("{}", { status: 404 });
    blobs.push(path);
    return json({
      sha: blob,
      encoding: "base64",
      content: btoa(files[path]!),
      size: files[path]!.length,
    });
  });
  return blobs;
}

async function readAll() {
  const store = createGitHubWorkspaceStore(
    { provider: "github", repo: "o/r", token: "t", root: "", branch: "b" },
    "docs",
  );
  const texts: string[] = [];
  for (const entry of await store.list("")) {
    const file = await store.readFile(entry.path);
    texts.push(new TextDecoder().decode(file?.content as Uint8Array));
  }
  return texts;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

it("reads each file of the GitHub store from GitHub once, across store instances", async () => {
  const blobs = fakeGitHub();
  expect(await readAll()).toEqual(["# A", "# B", "# C"]);
  expect(await readAll()).toEqual(["# A", "# B", "# C"]);
  expect(blobs).toEqual(["a.md", "b.md", "c.md"]);
});
