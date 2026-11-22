import { commentsRoleAllows, defineComments } from "vite-hub/comments";
import { inTeam } from "./utils/team.ts";

// The GitHub team can comment after /sign-in. Site Access sessions can act on the same threads according to their grants.
export const comments = defineComments({
  authorize: ({ user, action }) => inTeam(user) || commentsRoleAllows(user, action),
});
