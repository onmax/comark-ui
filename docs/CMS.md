# Personal Project CMS

The team edits the docs in the Content section of the [ViteHub Console](https://console.vitehub.dev) and comments on the pages of the site itself. Both are limited to the people in `server/utils/team.ts`.

## Edit in the Console

The site is linked to the Console. The Console signs each call to the site's one Console route, `POST /_vitehub/rpc`, with a key that it keeps for the link. The site has only the public key, in the Worker secret `VITEHUB_CONSOLE_KEY_CONSOLE_<8 hex>` that the Console shows when you link it. `server/console-authorize.ts` lets in a Console user whose email is in `server/utils/team.ts`, and the CLI, whose keys we make ourselves.

- To give someone access, invite them to the Console team that linked the site and add their email to `server/utils/team.ts`.
- **Preview** opens the page with the saved draft through a one-time link. Unsaved edits don't show in it.
- Live co-editing works only with `pnpm --filter comark-ui-docs dev`, where the Console route takes calls from this machine without a signature.
- The CLI can call the site with a key of its own: `vitehub secret console-key <name>` prints a pair. Set the `VITEHUB_CONSOLE_KEY_<NAME>` line on the Worker with `wrangler secret put`, keep the `VITEHUB_CONSOLE_PRIVATE_KEY_<NAME>` line where the CLI runs, and pass `--url https://comark-ui.onmax.me`. Content refuses CLI calls, because they sign no person and `server/content.ts` checks the person. Remove the Worker secret to revoke the key.

A save commits to the `vitehub/content` branch, and publishing opens a pull request into `main` (`server/content.ts`).

## Comment on the site

The site signs the team in with the [Personal Project CMS GitHub App](https://github.com/apps/personal-project-cms). Maxi owns the App under `onmax`. The same App can serve more personal projects by adding each project's exact callback URL.

For comark-ui, the callback is `https://comark-ui.onmax.me/api/auth/callback/github`. Open `/sign-in` to sign in. It returns to the landing page in comment mode. Anyone can sign in, but only the GitHub logins in `server/utils/team.ts` can comment.

The App has email read access for sign-in. Its repository permissions are contents write, pull requests write, and the required metadata read access. Install it only on repositories that use the CMS. The first installation, `176174996`, selects only `onmax/comark-ui`. Webhooks and Device Flow are disabled.

To add another project, add its exact `/api/auth/callback/github` URL in the App settings. Configure that project's bindings and its own session secret. Add the repository to the App installation when it needs repository access. Keep the project's team policy in its own application; signing in does not grant editing access.

## Bindings

| Binding | Value |
| --- | --- |
| `GITHUB_CLIENT_ID` | The App's OAuth client ID |
| `GITHUB_CLIENT_SECRET` | The App's OAuth client secret |
| `BETTER_AUTH_SECRET` | A separate stable secret for this project's sessions |
| `VITEHUB_GITHUB_APP_ID` | The App ID, `5510368`. Set it only together with the private key |
| `VITEHUB_GITHUB_PRIVATE_KEY` | A private key of the App, in PEM |
| `VITEHUB_GITHUB_INSTALLATION_ID` | The installation on this repository, `176174996`. Optional: it saves one lookup |
| `VITEHUB_GITHUB_TOKEN` | A token for the Content GitHub Store when the App is not set |
| `VITEHUB_CONSOLE_KEY_CONSOLE_<8 hex>` | The public key of the Console link, from the Console's setup page |

The OAuth credentials are saved in Bitwarden as **Personal Project CMS GitHub App**. Keep credentials out of source files and build logs.

The Content GitHub Store signs in as the App installation when the Worker has `VITEHUB_GITHUB_APP_ID` and `VITEHUB_GITHUB_PRIVATE_KEY`. The installation has a rate limit of its own, so agents that use the personal tokens of the same account can't use up the editor's requests, and its commits are made by the App's bot. Without the App, the Store uses `VITEHUB_GITHUB_TOKEN`. `VITEHUB_GITHUB_APP_ID` without a private key makes every Content call fail, so set both or neither. To add a private key, generate one in the App settings and save it in the Bitwarden item first.

Content keeps the GitHub answers that never change (commits, trees, archives) in Workers KV (`vitehub.kv` in `nuxt.config.ts`, the `comark-ui-kv` namespace), so a new isolate reads the Console overview with a few GitHub requests.
