// Bundled by the packages that read files, so they all guard the root the same way.

export class OutsideRoot extends Error {}

export const isMissing = (error: unknown) =>
  error instanceof Error &&
  "code" in error &&
  (error.code === "ENOENT" || error.code === "ENOTDIR");

/**
 * Joins `src` onto `folder` as strings, so the root check runs the same in Node, browsers, and edge runtimes. Returns
 * undefined when `src` climbs out of the folder.
 */
export function resolvePath(folder: string, src: string): string | undefined {
  const parts = folder ? folder.split("/") : [];
  for (const part of src.split(/[/\\]/)) {
    if (part === "" || part === ".") continue;
    if (part !== "..") parts.push(part);
    else if (parts.pop() === undefined) return undefined;
  }
  return parts.join("/");
}

/**
 * Reads files under `root` from disk, and undefined for one that isn't there. Throws `OutsideRoot` for one whose real
 * path leaves the root, which the string check in `resolvePath` can't see through a symlink.
 */
export function diskReader(root: string): (path: string) => Promise<string | undefined> {
  const folder = (root || ".").replace(/[/\\]+$/, "");
  return async (path) => {
    // Imported on first read, so the plugin loads in runtimes without node:fs when they pass their own `read`.
    const { readFile, realpath } = await import("node:fs/promises");
    const paths = await import("node:path");
    try {
      const [base, target] = await Promise.all([realpath(folder), realpath(`${folder}/${path}`)]);
      const inside = paths.relative(base, target);
      if (inside === ".." || inside.startsWith(`..${paths.sep}`) || paths.isAbsolute(inside))
        throw new OutsideRoot();
      return await readFile(target, "utf8");
    } catch (error) {
      if (isMissing(error)) return undefined;
      throw error;
    }
  };
}
