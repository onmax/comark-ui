import { readFileSync } from "node:fs";
import { expect, test } from "vite-plus/test";
import { runProjectFixture } from "vite-doctor/testkit";
import parts from "./parts.ts";

const files = Object.fromEntries(
  ["comments", "critic", "icon", "keys", "xref"].flatMap((name) => [
    [
      `packages/${name}/src/styles.ts`,
      readFileSync(
        new URL(
          `../packages/${name}/src/${["keys", "xref"].includes(name) ? "index" : "styles"}.ts`,
          import.meta.url,
        ),
        "utf8",
      ),
    ],
    [`packages/${name}/package.json`, JSON.stringify({ name: `comark-${name}` })],
  ]),
);

test("foreign parts of variable, template and unthemed roots are reported", async () => {
  const result = await runProjectFixture({
    files: {
      ...files,
      "packages/other/package.json": '{"name":"comark-other"}',
      "packages/other/src/styles.ts":
        'export const css = ".cr-tg,.ccm-private,.ci-private,.ckb-ctrl,.cxr-label{color:red}";',
    },
    extensions: [parts],
    config: { extends: ["comark-plugins/recommended"] },
  });
  expect(
    result.diagnostics.filter((d) => d.ruleId === "comark-plugins/no-foreign-parts"),
  ).toHaveLength(5);
});

test("documented roots remain allowed", async () => {
  const result = await runProjectFixture({
    files: {
      ...files,
      "packages/other/package.json": '{"name":"comark-other"}',
      "packages/other/src/styles.ts":
        'export const css = ".cr,.cr-cm,.cr-sg,.cr-bub,.cr-card,.ccm-ins,.ccm-del,.ccm-mark,.ccm-comment,.ci,.ckb,.cxr{color:red}";',
    },
    extensions: [parts],
    config: { extends: ["comark-plugins/recommended"] },
  });
  expect(result.diagnostics.filter((d) => d.ruleId === "comark-plugins/no-foreign-parts")).toEqual(
    [],
  );
});

test("declared dependencies remain allowed", async () => {
  const result = await runProjectFixture({
    files: {
      ...files,
      "packages/other/package.json":
        '{"name":"comark-other","dependencies":{"comark-comments":"*"}}',
      "packages/other/src/styles.ts":
        'export const css = ".cr-card,.cr-tg,.ccm-ins,.ccm-del,.ccm-mark,.ccm-comment,.ci{color:red}";',
    },
    extensions: [parts],
    config: { extends: ["comark-plugins/recommended"] },
  });
  expect(result.diagnostics.filter((d) => d.ruleId === "comark-plugins/no-foreign-parts")).toEqual(
    [],
  );
});
