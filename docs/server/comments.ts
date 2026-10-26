import { defineComments } from "vite-hub/comments";
import { inTeam } from "./utils/team.ts";

// The team reads and writes the threads; for everyone else the overlay downloads nothing.
export default defineComments({ authorize: ({ user }) => inTeam(user) });
