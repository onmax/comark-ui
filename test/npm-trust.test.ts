// pnpm's trustPolicy: no-downgrade refuses a version with weaker evidence than any earlier one, and comark-annotate,
// comark-carousel, and comark-zoom began with staged publishes. A release that goes out unstaged can't be installed
// under that policy, so the release workflow must stage every package.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vite-plus/test";
import { evidence, evidenceNames, stagedPublish, strongestBefore } from "../.github/npm-trust.ts";

// The fields npm recorded for comark-zoom@0.1.0 (staged) and comark-zoom@0.12.1 (published directly).
const provenance = {
  attestations: { provenance: { predicateType: "https://slsa.dev/provenance/v1" } },
};
const trustedPublisher = { id: "github", oidcConfigId: "71ad6578-8b87-43f9-8325-9c8808a703d4" };
const staged = {
  _npmUser: { name: "GitHub Actions", approver: { name: "onmax_" }, trustedPublisher },
  dist: provenance,
};
const direct = { _npmUser: { name: "GitHub Actions", trustedPublisher }, dist: provenance };

describe("evidence", () => {
  it("ranks as pnpm does", () => {
    expect(evidenceNames[evidence(staged)]).toBe("staged publish");
    expect(evidenceNames[evidence(direct)]).toBe("trusted publisher");
    expect(evidenceNames[evidence({ _npmUser: { trustedPublisher } })]).toBe("no trust evidence");
    expect(evidenceNames[evidence({ dist: provenance })]).toBe("provenance");
  });

  it("finds the staged publish that blocks comark-zoom@0.12.1", () => {
    const packument = {
      versions: { "0.0.0-stage": {}, "0.1.0": staged, "0.12.0": direct, "0.12.1": direct },
      time: {
        "0.0.0-stage": "2026-10-19T14:16:07.840Z",
        "0.1.0": "2026-10-19T17:16:28.075Z",
        "0.12.0": "2026-11-12T15:39:25.302Z",
        "0.12.1": "2026-11-14T09:26:24.567Z",
      },
    };
    expect(strongestBefore(packument, "0.12.1")).toBe(stagedPublish);
    expect(evidence(direct)).toBeLessThan(strongestBefore(packument, "0.12.1"));
  });
});

it("stages every package instead of publishing it directly", () => {
  const workflow = readFileSync(
    new URL("../.github/workflows/release.yaml", import.meta.url),
    "utf8",
  );
  expect(workflow).toContain("npm stage publish");
  expect(workflow.replaceAll("npm stage publish", "")).not.toContain("npm publish");
});
