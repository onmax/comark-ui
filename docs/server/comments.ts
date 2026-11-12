import { defineComments } from "vite-hub/comments";
import { inTeam } from "./utils/team.ts";

// Figma-style comments on the docs pages, for the team only (utils/team.ts). The team signs in at /sign-in, which turns
// comment mode on, and every other visitor gets the prerendered files unchanged. The Console's Comments section lists
// the same threads, for the same people.
export const comments = defineComments({ authorize: ({ user }) => inTeam(user) });
