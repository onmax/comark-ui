---
title: Sharing a review
description: Put a review document where reviewers comment on it, or on a page you host.
keywords: Drop, publish, host, comments, feedback, deploy
tagline: Get a review document in front of reviewers. Publish it to Drop, where reviewers comment on the exact spot and your agent answers with the next version, or render it to a page of your own.
---

::tabs{sync="share"}
:::tabs-item{label="Drop"}
[Drop](https://drop.vitehub.dev/?utm_source=comark-ui&utm_medium=recipe) renders comark-annotate Markdown, so the document your agent wrote is the page reviewers open. Reviewers click a spot on a screenshot or select a sentence to comment. The agent reads the open comments and publishes the next version, and earlier versions stay in the history.

1. Add Drop's MCP server to your agent, and sign in with GitHub when it asks:

   ```sh
   claude mcp add --transport http --scope user drop https://drop.vitehub.dev/mcp
   ```

2. Ask for the evidence, for example "Capture the pigeon counter's before and after and drop it for review." The `pr-evidence` skill, which comes with the server, captures both states, measures each mark from the page, and answers with a link and a snippet for the pull request.
3. Paste the snippet into the pull request. Drop keeps pull request evidence until someone deletes it, so the link keeps working after the merge.

::embed{url="https://drop.vitehub.dev/docs/agents?utm_source=comark-ui&utm_medium=recipe" title="Connect Claude, Codex, Cursor, or another agent to Drop"}
::
:::

:::tabs-item{label="Your own page"}
Render the document with the plugins it uses, as [Renderers](/guide/renderers/#several-plugins) shows, and deploy the page with your preview. For a document of screenshots, first [install the CLI directly](/annotate/#cli) at the same version as the project's Comark UI packages. `comark-annotate render` writes the page for you. Keep the images next to it:

```sh
vp exec comark-annotate render review.md -o review.html
```

Link the page from the pull request, or upload it as a CI artifact. GitHub shows HTML files as source, so for evidence that sits in the pull request itself, attach a screenshot of the rendered page.
:::
::

## Which to use

Drop fits a review that goes back and forth. Comments sit on the screenshot they're about, and the agent fixes what they ask without anyone copying feedback into a chat.

Your own page fits a team that wants no service in the loop, or that already reviews on preview deployments.

Either way, write the document first, as [A review document](/recipes/review/) shows, and check it with [lint-comark](/lint/) before it goes out.

## About Drop

Drop is made by the author of these plugins. Anyone with a GitHub account can sign in at drop.vitehub.dev. A new drop is visible only to you until you share it with your team or by link. Its [docs](https://drop.vitehub.dev/docs?utm_source=comark-ui&utm_medium=recipe) cover sharing, versions, and how long each kind of drop is kept.

Drop is open source under Apache-2.0, so a team can [run its own](https://drop.vitehub.dev/docs/self-host?utm_source=comark-ui&utm_medium=recipe) on Cloudflare, Vercel, Netlify, Deno Deploy, or a VPS, and keep its review documents on its own infrastructure.
