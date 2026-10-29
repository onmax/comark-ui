# Personal Project CMS

The documentation site uses the [Personal Project CMS GitHub App](https://github.com/apps/personal-project-cms) for sign-in. Maxi owns the App under `onmax`. The same App can serve more personal projects by adding each project's exact callback URL.

For comark-ui, the callback is `https://comark-ui.onmax.me/api/auth/callback/github`. With the currently pinned ViteHub preview, open `/sign-in` to sign in with GitHub, then open `/_vitehub` to edit. The Console authorization file keeps the existing team restriction and local development behavior.

The built-in Console sign-in requires the ViteHub upgrade in [#262](https://github.com/onmax/comark-ui/pull/262). Keep `server/routes/sign-in.get.ts` until that upgrade ships. Once the checked-in dependency provides app Auth sign-in, remove the fallback route and open `/_vitehub` to sign in. ViteHub then provides the provider button, retry state, return URL, and account sign-out using the existing server Auth Definition, without a project-specific sign-in page or Console Auth client.

Each project needs these private runtime bindings:

| Binding | Value |
| --- | --- |
| `GITHUB_CLIENT_ID` | The App's OAuth client ID |
| `GITHUB_CLIENT_SECRET` | The App's OAuth client secret |
| `BETTER_AUTH_SECRET` | A separate stable secret for this project's sessions |
| `VITEHUB_GITHUB_TOKEN` | This project's Content GitHub Store credential |

The OAuth credentials are saved in Bitwarden as **Personal Project CMS GitHub App**. Keep credentials out of source files and build logs. The Content GitHub Store still uses `VITEHUB_GITHUB_TOKEN`; an App installation alone does not configure that Store's authentication.

The App has email read access for sign-in. Its repository permissions are contents write, pull requests write, and the required metadata read access. Install it only on repositories that use the CMS. The first installation, `176174996`, selects only `onmax/comark-ui`. Webhooks and Device Flow are disabled.

To add another project, add its exact `/api/auth/callback/github` URL in the App settings. Configure that project's bindings and its own session secret. Add the repository to the App installation when it needs repository access. Keep the project's team policy in its own application; signing in does not grant editing access.
