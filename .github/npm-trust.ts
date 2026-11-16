// pnpm's `trustPolicy: no-downgrade` refuses a version when any version published before it carries stronger
// evidence, so one release with weaker evidence than an earlier one stays uninstallable for those users forever.
// Every release is staged, the strongest evidence pnpm knows. This waits until each staged version is approved and
// fails when one went out without that evidence.
//
// Usage: node .github/npm-trust.ts <minutes to wait> <name@version>...

type Manifest = {
  _npmUser?: { approver?: unknown; trustedPublisher?: unknown };
  dist?: { attestations?: { provenance?: unknown } };
};
type Packument = { versions: Record<string, Manifest>; time: Record<string, string> };

// pnpm's ranking, weakest first: resolving-npm-resolver/src/trust_checks.rs in pnpm/pnpm.
export const evidenceNames = [
  "no trust evidence",
  "provenance",
  "trusted publisher",
  "staged publish",
] as const;
export const stagedPublish = 3;

export function evidence(manifest: Manifest): number {
  // npm records who approved a staged publish with 2FA.
  if (manifest._npmUser?.approver) return stagedPublish;
  const provenance = Boolean(manifest.dist?.attestations?.provenance);
  // pnpm counts a trusted publisher only alongside its provenance attestation.
  if (provenance && manifest._npmUser?.trustedPublisher) return 2;
  return provenance ? 1 : 0;
}

const prerelease = (version: string) => version.split("+")[0].includes("-");

/** The strongest evidence of any version published before `version`. pnpm skips prereleases for a stable version. */
export function strongestBefore(packument: Packument, version: string): number {
  const publishedAt = Date.parse(packument.time[version] ?? "");
  let strongest = 0;
  for (const [other, manifest] of Object.entries(packument.versions)) {
    if (other === version || (!prerelease(version) && prerelease(other))) continue;
    // A registry cache can serve the packument from before `version` went out, and then everything in it is older.
    if (Date.parse(packument.time[other] ?? "") < publishedAt || Number.isNaN(publishedAt)) {
      strongest = Math.max(strongest, evidence(manifest));
    }
  }
  return strongest;
}

async function registry(path: string) {
  const response = await fetch(`https://registry.npmjs.org/${path}`, {
    signal: AbortSignal.timeout(15_000),
  });
  if (response.status === 404) return undefined;
  if (!response.ok) throw new Error(`GET ${path}: ${response.status}`);
  return response.json();
}

async function main([minutes, ...releases]: string[]) {
  const deadline = Date.now() + Number(minutes) * 60_000;
  if (Number.isNaN(deadline) || !releases.length) {
    throw new Error("Usage: node .github/npm-trust.ts <minutes to wait> <name@version>...");
  }
  const pending = new Set(releases);
  let failed = false;
  while (pending.size) {
    for (const release of pending) {
      const at = release.lastIndexOf("@");
      const [name, version] = [release.slice(0, at), release.slice(at + 1)];
      // Until it is approved, a staged version is not on npm. Version URLs skip the cached packument.
      const manifest = (await registry(`${name}/${version}`).catch(() => undefined)) as
        | Manifest
        | undefined;
      if (!manifest) continue;
      pending.delete(release);
      const current = evidence(manifest);
      if (current === stagedPublish) {
        console.log(`${release}: ${evidenceNames[current]}`);
        continue;
      }
      failed = true;
      const prior = strongestBefore((await registry(name)) as Packument, version);
      const downgrade =
        current < prior
          ? ` An earlier ${name} had ${evidenceNames[prior]}, so pnpm's trustPolicy: no-downgrade refuses this version.`
          : "";
      console.log(
        `::error::${release} went out with ${evidenceNames[current]}, not staged publish.${downgrade}`,
      );
    }
    if (!pending.size || Date.now() > deadline) break;
    console.log(`Waiting for approval on npmjs.com: ${[...pending].join(", ")}`);
    await new Promise((resolve) => setTimeout(resolve, 60_000));
  }
  for (const release of pending) {
    console.log(`::error::${release} is not on npm. Approve it on npmjs.com, then rerun this job.`);
  }
  if (failed || pending.size) process.exitCode = 1;
}

if (import.meta.main) await main(process.argv.slice(2));
