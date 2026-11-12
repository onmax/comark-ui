import { defineConsoleAuthorize } from "vite-hub/console/auth";
import { inTeam } from "./utils/team.ts";

// Every call to /_vitehub/rpc is signed with a key whose public half is a VITEHUB_CONSOLE_KEY_<NAME> binding.
// - The ViteHub Console signs the person who calls, and they must be in the team (utils/team.ts).
// - The CLI signs no person. Its key is one we made and set on the Worker ourselves, so it gets everything.
// - `nuxt dev` takes calls without a signature (nuxt.config.ts `$development`), from this machine only.
export default defineConsoleAuthorize((context) => {
  if (context.via === "console") return inTeam(context.user);
  if (context.via === "cli") return true;
  return context.via === undefined && import.meta.dev === true;
});
