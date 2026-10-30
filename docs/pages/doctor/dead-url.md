An external URL that answers 404 or 410, whose host has no DNS record, or whose TLS certificate fails. Readers who follow it find nothing, and the fix names the page's archived copy.

It sends a GET, the way a browser does, and stops reading once the headers arrive. A 401, 403, 429, or 999 means the site turns robots away, a 5xx is tried once more, and a timeout is a slow site, so none of those are reported; redirects aren't either, and nor are fragments on external pages. Requests to `github.com` carry `GITHUB_TOKEN` when it's set, so CI isn't rate-limited. Each URL is requested once per run, and the ones that worked are cached for a day. When the network is down, it prints one warning and reports nothing.

It's off by default, since it depends on the network and not on the Markdown, so it has no example here. Turn it on with `--check-urls`, or with `links.urls`:

```sh
pnpm comark-lint "docs/**/*.md" --check-urls
```

```txt
docs/ducks.md:20:1 comark/dead-url The link to `https://example.com/old-pond` on line 20 answers 404 Not Found. Link the page where it moved, or its archived copy (`https://web.archive.org/web/https://example.com/old-pond`). If the page is there and the site answers 404 anyway, add the URL to `links.skip`.
```
