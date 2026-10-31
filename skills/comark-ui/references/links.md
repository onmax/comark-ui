# Heading links and new-tab links

comark-links has no blocks of its own. `anchors()` puts a `#` link beside each h2, h3, and h4, so readers can share a section. `external()` writes `target` and `rel` on links to other sites, and warns before any link opens a new tab.

## What you write

```md
## Rollout plan {#rollout}

Week one is internal teams only. The [rollback steps](#rollback) apply from day one.

## Rollback {#rollback}

Turn off the `new-checkout` flag in **Settings**, then redeploy.
```

- A heading's `#` link uses its id. Comark makes the id from the heading's text, so write `{#rollout}` after a heading that other pages link to, and the link survives a reworded heading.
- A link opens a new tab only when the host sets `target` or the link says `{target="_blank"}`. Leave both off, so the reader decides; add one only where leaving loses the reader's work, such as a page with a half-filled form. Any link that opens a new tab, on your site or another, gets a ↗ and "(opens in a new tab)" for screen readers, so leave that out of the link's text. Any link with `target="_blank"` also gets `rel="noopener"`.
- A link keeps the `target` and `rel` written on it, such as `{rel="me"}` on a profile link, or `{target="_self"}` to keep one link in the tab when the host opens the others in a new one.

## Options

| `anchors()` | Default | What it does |
| --- | --- | --- |
| `levels` | `[2, 3, 4]` | The heading levels that get a link. |
| `label` | `Section titled "…"` | A function from the heading's text to what screen readers hear for the link. |
| `icon` | `"#"` | What the link shows. |

Only a heading with an id gets a link, so under Comark's `headingIds: false` only headings with `{#id}` get one.

| `external()` | Default | What it does |
| --- | --- | --- |
| `target` | `false` | Where external links open, such as `"_blank"`. |
| `rel` | `[]` | Words added to external links' `rel`, such as `["nofollow", "ugc"]`. |
| `hosts` | `[]` | Your own hosts, whose links stay internal. Each entry matches one host exactly, so list every subdomain you link to. |
| `test` | http, https, and `//` links not on `hosts` | A function of the `href` that says whether a link is external. It replaces the default, so `hosts` stops counting. |
| `icon` | `true` | Draws ↗ after a link that opens a new tab. |
| `label` | `"(opens in a new tab)"` | What screen readers hear after that link. `""` leaves it out. |

## Register

- In `comark-ui`: both on, as `links: { anchors, external }`, and either takes `false` or its options. With no options, `external()` opens nothing in a new tab. comark-chips runs first and turns every web link into a chip, and a chip drops the link's `target` and `rel`, both its own and `external()`'s. Write `{chip=false}` on a web link that needs them, such as `{chip=false rel="me"}`.
- Alone: `pnpm add comark @comark/html comark-links`, then `createHtmlRenderer({ plugins: [anchors(), external()], components })` with all three from `comark-links/html`, which has no default export. Register either plugin or both, in any order. Either one needs the components, which draw the heading links and style the new-tab warning. `comark-links/vue`, `/react`, and `/svelte` export the same for those renderers.
