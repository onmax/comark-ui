A link that works only on the writer's machine or for a while: `localhost` and `*.localhost`, `127.0.0.0/8`, `::1`, `0.0.0.0`, private networks (`10/8`, `172.16/12`, `192.168/16`, `169.254/16`, `*.local`, `*.internal`), `file:` URLs, tunnels (ngrok, `*.trycloudflare.com`, `*.loca.lt`), and deploy previews (Netlify's `deploy-preview-42--site.netlify.app` and Vercel's `app-git-branch-team.vercel.app`). A production `*.vercel.app` or `*.netlify.app` host is fine.

Comark turns a bare URL in prose into a link, so `Open http://localhost:5173` is reported too. Write it as code when the address is the point. The rule is on by default: `links.block` adds patterns, `links.allow` reports every host it doesn't list, and `links.skip` lets a link through.

::incorrect
```md
The new pond map is up at http://localhost:5173/ponds.
```
::

::correct
```md
The new pond map is up at [example.com/ponds](https://example.com/ponds). Before the deploy, it ran at `http://localhost:5173/ponds`.
```
::
