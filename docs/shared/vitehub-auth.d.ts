// The pinned ViteHub build generates these declarations but omits them from its
// types.d.ts entry point. Include them in Nuxt's app, server, and shared projects.
import "../.vitehub/types/auth.d.ts";
import "../.vitehub/types/auth-server.d.ts";
