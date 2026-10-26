import { defineConsoleAuthorize } from "vite-hub/console/auth";
import { inTeam } from "./utils/team.ts";

export default defineConsoleAuthorize(({ user }) => inTeam(user));
