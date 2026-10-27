# Diagrams

comark-diagrams draws PlantUML, Graphviz, D2, DBML, GoAT, and Svgbob fences as SVG while parsing, through a Kroki server, and puts the drawing in the page with no script. Use it when a flow or a schema shows a change faster than prose.

## Syntax

````md
```d2 [How a sighting reaches the map]
phone -> api: POST /sightings
api -> queue: dedupe
queue -> map: pigeon pin
```
````

| Fence | Draws |
| --- | --- |
| `plantuml` | UML: sequence, class, state, and other diagrams |
| `graphviz` or `dot` | Graphs in the DOT language |
| `d2` | Boxes and arrows in D2's short syntax |
| `dbml` | Database tables and their relations |
| `goat` or `svgbob` | ASCII art, as lines and arrows |

- The title in brackets after the language goes under the diagram and names it for screen readers. Give every diagram one.
- Every other fence stays code, except `mermaid`, which comark-ui draws with comark-pele (see Mermaid below).
- A diagram Kroki can't draw stays code, and `meta.issues` quotes the tool's error. So does one drawn while the server can't be reached; the next parse tries again.
- The plugin drops anything that could run from the SVG: scripts, event handlers, embedded HTML, and animations. Write labels as plain text. A D2 Markdown label (`|md … |`) is embedded HTML, so it comes out empty, and nothing reports it.

## Mermaid

Through comark-ui, a ` ```mermaid ` fence is drawn as SVG by comark-pele while rendering, with no network, and themed with the other blocks. A diagram Pele can't draw shows its source, and nothing goes in `meta.issues`, so check it in a render.

With `comark-ui/html`, a click, `Enter`, or `Space` zooms the diagram, and its buttons copy it as a PNG on the page's background or as its ` ```mermaid ` fence. The Vue, React, and Svelte entries draw the same buttons, and Pele zooms the diagram in place there. `zoom: false` in `comarkUi()` turns the zoom off; the buttons stay. A host with a strict Content Security Policy allows the buttons' script by the hash of `mermaidScript` from `comark-ui/html`.

## Check each diagram

Send an internal architecture or a schema with sensitive names only to the host's own Kroki server. With the default `server`, each diagram's source goes to `https://kroki.io`, a public service.

The linter sends nothing, so it can't tell whether a diagram draws. Render the document, or post the source to the same Kroki server and read the answer:

```sh
curl -s -H "Content-Type: text/plain" --data-binary @flow.d2 https://kroki.io/d2/svg
```

An SVG means it draws; any other answer is the tool's error.

## Register

- In `comark-ui`: on, with the options below under `diagrams`.
- Alone: `pnpm add comark @comark/html comark-diagrams`, then `createHtmlRenderer({ plugins: [diagrams()], components })` with both from `comark-diagrams/html`. `comark-diagrams/vue`, `/react`, and `/svelte` render it too.

`server` is the Kroki server, `https://kroki.io` by default. `docker run -d -p 8000:8000 yuzutech/kroki` runs your own, which draws every fence above, and `diagrams({ server: "http://localhost:8000" })` points at it. `draw: false` leaves every fence as code and sends nothing, for a lint step. The plugin draws each diagram once per process, and a failed one again on the next parse.
