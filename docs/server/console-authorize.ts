import { defineConsoleAuthorize } from "vite-hub/console/auth";
import { inTeam } from "./utils/team.ts";

// `nuxt dev` runs the Console without a sign-in (nuxt.config.ts `$development`), so there is no user to check there. A
// build checks the team.
export default defineConsoleAuthorize(({ user }) => import.meta.dev === true || inTeam(user));
