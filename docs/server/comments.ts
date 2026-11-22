import { commentsRoleAllows, defineComments } from "vite-hub/comments";
import { hasConsoleGrant, inTeam } from "./utils/team.ts";

// Draft previews and published pages share comment threads. Only the team may use Comments, even with a Site Access grant.
export const comments = defineComments({
  authorize: ({ user, action }) =>
    inTeam(user) ||
    (user?.emailVerified === true &&
      hasConsoleGrant(user.role) &&
      inTeam({ email: user.email }) &&
      commentsRoleAllows(user, action)),
});
