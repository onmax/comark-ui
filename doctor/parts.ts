import {
  createRule,
  defineDoctorDiagnostics,
  defineDoctorExtension,
  defineRulePack,
} from "vite-doctor/extension";

const id = "comark-plugins/no-foreign-parts";
const diagnostics = defineDoctorDiagnostics([{ code: "COMARKREPO0001", ruleId: id }]);

// A package's `theme()` call names its blocks' roots, the classes other packages may style. Every other class with its
// prefix is a part, which only that package and the packages that render its markup know about. A package that styles
// another's parts breaks when they change and fixes half of what it meant to: comark-tabs hid comark-code's title but
// left the room comark-code made for its header, an empty band above every code group.
const rule = createRule({
  meta: {
    id,
    title: "Style another package's blocks only through their roots",
    category: "correctness",
    severity: "error",
    execution: "manifest",
    cacheScope: "none",
  },
  create(ctx) {
    return {
      onProjectEnd() {
        const exclude = ["**/node_modules/**", "**/dist/**", "**/*.d.ts"];
        const sources = new Map<string, string>();
        for (const file of ctx.fs.glob("packages/*/src/**/*.{ts,css,vue,svelte}", { exclude }))
          sources.set(file, ctx.fs.readText(file) ?? "");
        const packageOf = (file: string) => /packages\/([^/]+)\/src\//.exec(file)?.[1] ?? "";
        const owners = new Map<string, string>();
        const roots = new Set<string>();
        for (const [file, text] of sources)
          for (const [, selectors = ""] of text.matchAll(/theme\("([^"]+)"/g))
            for (const [root = "", prefix = ""] of selectors.matchAll(/\.(c[a-z]+)(?:-[a-z]+)*/g)) {
              owners.set(prefix, packageOf(file));
              roots.add(root);
            }
        const field = (dir: string, key: string) => {
          const json = ctx.fs.readJson(`packages/${dir}/package.json`);
          return json && typeof json === "object"
            ? new Map(Object.entries(json)).get(key)
            : undefined;
        };
        const nameOf = (dir: string) => String(field(dir, "name") ?? dir);
        const dependsOn = (dir: string, other: string) => {
          const found = field(dir, "dependencies");
          return !!found && typeof found === "object" && nameOf(other) in found;
        };
        for (const [file, text] of sources) {
          const dir = packageOf(file);
          for (const match of text.matchAll(/(?<![\w$])\.(c[a-z]+)(?:-[a-z0-9]+)*(?![\w-])/g)) {
            const owner = owners.get(match[1] ?? "");
            if (!owner || owner === dir || roots.has(match[0]) || dependsOn(dir, owner)) continue;
            const [name, ownerName] = [nameOf(dir), nameOf(owner)];
            ctx.report(
              diagnostics.diagnostics.COMARKREPO0001({
                why: `\`${match[0]}\` is a part of ${ownerName}'s blocks, and ${name} doesn't render them.`,
                fix: `Style ${ownerName}'s blocks only through their roots and the attributes and variables it documents, and add what ${name} needs to that contract in ${ownerName}.`,
              }),
              {
                file,
                range: ctx.helpers.rangeFromOffsets(
                  file,
                  text,
                  match.index,
                  match.index + match[0].length,
                ),
              },
            );
          }
        }
      },
    };
  },
});

/** The repository's own Rules, for the packages' sources. */
export default defineDoctorExtension({
  name: "comark-plugins",
  rulePacks: [
    defineRulePack({
      name: "comark-plugins",
      version: "1.0.0",
      rules: [rule],
      diagnostics,
      presets: { recommended: [id] },
    }),
  ],
});
