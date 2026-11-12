// The people who may comment on the docs and edit them. Everyone else, signed in or not, is an anonymous visitor.
// Lowercase: GitHub logins and email addresses are not case sensitive.
const TEAM = [{ login: "onmax", emails: ["hello@onmax.me", "maximogarciamtnez@gmail.com"] }];

type Person = { id?: string; login?: unknown; email?: unknown } | null | undefined;

// Two kinds of people reach the policies, and they share no ids:
// - Someone signed in to the site with GitHub (server/auth.ts) has the `login` that GitHub gave, which no request can
//   change. Comments on the pages passes them. Only the login counts for them.
// - The ViteHub Console signs its caller as `{ id, name, email }`, with an id of its own and no login. The Console only
//   signs for the members of the team that linked the site, and takes the email from GitHub, verified. Only the email
//   counts for them.
// `nuxt dev` takes Console calls without a signature and runs them as the user `local`; a build never does.
export function inTeam(user: Person): boolean {
  if (!user) return false;
  if (import.meta.dev === true && user.id === "local") return true;
  if ("login" in user) {
    const login = user.login;
    return typeof login === "string" && TEAM.some((member) => member.login === login.toLowerCase());
  }
  const email = user.email;
  return (
    typeof email === "string" && TEAM.some((member) => member.emails.includes(email.toLowerCase()))
  );
}
