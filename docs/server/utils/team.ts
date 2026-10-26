// GitHub logins that may comment on the docs and edit them. Everyone else, signed in or not, is an anonymous visitor.
// Lowercase: GitHub logins are not case sensitive.
const TEAM = ["onmax"];

type Person = { id?: string; login?: unknown } | null | undefined;

// Auth stores the login with the user (server/auth.ts), so the policies read it from there. `nuxt dev` has no GitHub
// OAuth app and runs every call as the user `local`; a build never does.
export const inTeam = (user: Person) =>
  (typeof user?.login === "string" && TEAM.includes(user.login.toLowerCase())) ||
  (import.meta.dev === true && user?.id === "local");
