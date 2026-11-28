import { type Component, defineAsyncComponent } from "vue";

type Renderer = { components: Record<string, Component> };

// Each tag imports its package's Vue entry the first time a document renders it. A test checks that the tags here are
// the tags of `comark-ui/vue`, so a package that adds a component fails it until the component is listed.
const lazy = (load: () => Promise<Renderer>, tags: string[]): Record<string, Component> =>
  Object.fromEntries(
    tags.map((tag) => [
      tag,
      defineAsyncComponent(() =>
        load().then(({ components }) => {
          const component = components[tag];
          if (!component)
            throw new Error(`comark-ui/vue/lazy lists ${tag}, which its package doesn't export.`);
          return component;
        }),
      ),
    ]),
  );

/**
 * The components of `comark-ui/vue`, for a document parsed elsewhere, where each block's package loads on first use. A
 * page downloads only the blocks it renders. Vue's server renderer waits for them, so a server render arrives drawn.
 */
export const components = {
  ...lazy(() => import("comark-carousel/vue"), ["Carousel", "Slide"]),
  ...lazy(() => import("comark-cast/vue"), ["Cast"]),
  ...lazy(() => import("comark-charts/vue"), ["Chart"]),
  ...lazy(() => import("comark-chips/vue"), ["Chip"]),
  ...lazy(() => import("comark-colors/vue"), ["Color", "Palette"]),
  ...lazy(() => import("comark-diagrams/vue"), ["Diagram"]),
  ...lazy(() => import("./vue-mermaid.ts"), ["pele"]),
  ...lazy(() => import("comark-embed/vue"), ["Embed"]),
  ...lazy(() => import("comark-github/vue"), ["GithubCallout"]),
  ...lazy(() => import("comark-icon/vue"), ["Icon"]),
  ...lazy(() => import("comark-mark/vue"), ["Mark", "Sup"]),
  ...lazy(() => import("comark-mathml/vue"), ["Formula"]),
  ...lazy(() => import("comark-details/vue"), ["Accordion", "Disclosure", "DisclosureSummary"]),
  ...lazy(() => import("comark-links/vue"), ["H1", "H2", "H3", "H4", "H5", "H6", "LinksStyles"]),
  ...lazy(() => import("comark-file-tree/vue"), ["FileTree", "FileTreeItem"]),
  ...lazy(() => import("comark-fields/vue"), ["Field", "FieldGroup"]),
  ...lazy(() => import("comark-properties/vue"), ["Properties"]),
  ...lazy(() => import("comark-social/vue"), ["Post"]),
  ...lazy(() => import("comark-badge/vue"), ["Badge"]),
  ...lazy(() => import("comark-media/vue"), ["Media"]),
  ...lazy(() => import("comark-metrics/vue"), ["Delta", "ProgressBar", "StatTiles"]),
  ...lazy(() => import("comark-table/vue"), ["DataTable"]),
  ...lazy(
    () => import("comark-cards/vue"),
    ["Card", "CardTitle", "CardGroup", "Columns", "Column"],
  ),
  ...lazy(() => import("comark-qr/vue"), ["Qr"]),
  ...lazy(() => import("comark-sources/vue"), ["Sources"]),
  ...lazy(() => import("comark-steps/vue"), ["Steps", "Step"]),
  ...lazy(() => import("comark-tabs/vue"), ["Tabs", "TabsItem"]),
  ...lazy(() => import("comark-outline/vue"), ["Toc", "TocRail"]),
  ...lazy(() => import("comark-tests/vue"), ["Tests"]),
  ...lazy(() => import("comark-git-graph/vue"), ["GitGraph", "GitGraphLines"]),
  ...lazy(() => import("comark-bundle/vue"), ["Bundle"]),
  ...lazy(() => import("comark-time/vue"), ["RelativeTime"]),
  ...lazy(() => import("comark-zoom/vue"), ["Zoom", "ZoomRuntime"]),
  ...lazy(() => import("comark-motion/vue"), ["MotionRuntime"]),
  ...lazy(() => import("comark-magic-move/vue"), ["MagicMove", "MagicMoveStep"]),
  ...lazy(() => import("comark-code/vue"), ["Pre"]),
  ...lazy(() => import("comark-code-notes/vue"), ["CodeNotes"]),
  // Every document has the typeset styles, but they are about 12 kB, so they load with the first document like a block.
  // A server render already holds them.
  ...lazy(() => import("./vue-typeset.ts"), ["typeset-styles"]),
} satisfies Record<string, Component>;
