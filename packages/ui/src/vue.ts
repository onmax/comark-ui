import {
  type Component,
  defineAsyncComponent,
  defineComponent,
  h,
  onBeforeUnmount,
  onMounted,
  type PropType,
} from "vue";
import * as badge from "comark-badge/vue";
import * as cards from "comark-cards/vue";
import * as carousel from "comark-carousel/vue";
import * as cast from "comark-cast/vue";
import * as charts from "comark-charts/vue";
import * as chips from "comark-chips/vue";
import * as code from "comark-code/vue";
import * as codeNotes from "comark-code-notes/vue";
import * as colors from "comark-colors/vue";
import * as details from "comark-details/vue";
import * as diagrams from "comark-diagrams/vue";
import * as embed from "comark-embed/vue";
import * as fields from "comark-fields/vue";
import * as fileTree from "comark-file-tree/vue";
import * as github from "comark-github/vue";
import * as icon from "comark-icon/vue";
import * as links from "comark-links/vue";
import * as magicMove from "comark-magic-move/vue";
import * as mark from "comark-mark/vue";
import * as math from "comark-mathml/vue";
import * as media from "comark-media/vue";
import pele from "comark-pele";
import * as metrics from "comark-metrics/vue";
import * as outline from "comark-outline/vue";
import * as properties from "comark-properties/vue";
import * as qr from "comark-qr/vue";
import * as sources from "comark-sources/vue";
import * as steps from "comark-steps/vue";
import * as table from "comark-table/vue";
import * as tabs from "comark-tabs/vue";
import * as tests from "comark-tests/vue";
import * as gitGraph from "comark-git-graph/vue";
import * as bundle from "comark-bundle/vue";
import * as time from "comark-time/vue";
import * as zoom from "comark-zoom/vue";
import { addMermaidStyles, mermaidBar, startMermaid } from "./client.ts";
import { type Preset, type PresetOptions, preset } from "./index.ts";
import { issuesCss, issuesInner, issuesOf, type IssuesOptions } from "./issues.ts";
import { typesetCss } from "./typeset-css.ts";
import { addStyles } from "../../../shared/styles.ts";

export { commentsCss, criticCss } from "./index.ts";
export type { PresetOptions } from "./index.ts";
export { issuesCss, issuesOf, type IssuesOptions } from "./issues.ts";

/**
 * The problems a parse found in a document, from `meta.issues`, as `comark-ui/html`'s `renderIssues()` draws them. It
 * renders nothing when there are none, and adds its styles when it mounts. Put it above the document.
 */
export const ComarkIssues = defineComponent({
  name: "ComarkIssues",
  props: {
    meta: { type: Object, default: undefined },
    // SAFETY: Vue checks each value is a string or a function, which IssuesOptions calls with the count.
    title: { type: [String, Function] as PropType<IssuesOptions["title"]>, default: undefined },
    // SAFETY: as `title`.
    hint: { type: [String, Function] as PropType<IssuesOptions["hint"]>, default: undefined },
  },
  setup(props) {
    onMounted(() => addStyles("issues", issuesCss));
    return () => {
      const issues = issuesOf(props.meta);
      if (!issues.length) return null;
      const inner = issuesInner(issues, { title: props.title, hint: props.hint });
      return h("details", { class: "cis", "data-comark-frame": "", open: true, innerHTML: inner });
    };
  },
});

// Pele is about 270 kB gzipped, so it loads only when a document has a diagram. Vue's server renderer waits for it, so a
// server render still arrives drawn.
const Pele = defineAsyncComponent(() =>
  import("comark-pele/vue").then(({ createPeleComponent }) =>
    createPeleComponent({ onRender: addMermaidStyles, onError: addMermaidStyles }),
  ),
);

// Pele's card in `.cmm` with the bar of buttons, as `comark-ui/html` draws it. In the browser Pele's own `mount()` zooms
// the diagram in place, so it doesn't zoom with comark-zoom.
const Mermaid = defineComponent({
  name: "ComarkMermaid",
  inheritAttrs: false,
  props: { content: { type: String, default: "" } },
  setup(props, { attrs }) {
    let stop = () => {};
    onMounted(() => (stop = startMermaid()));
    onBeforeUnmount(() => stop());
    return () =>
      h("div", { class: "cmm", "data-comark-frame": "", "data-source": props.content }, [
        // SAFETY: Comark passes the node's attributes, whose `class` is a string, as Pele's prop takes it.
        h(Pele, { ...(attrs as { class?: string }), content: props.content }),
        h("div", { class: "cmm-bar", innerHTML: mermaidBar() }),
      ]);
  },
});
const mermaid = { default: pele, components: { pele: Mermaid } };

// Rendered with the document rather than added on mount, so `@scope` styles its root and server renders arrive styled.
const typeset = defineComponent({
  name: "ComarkTypeset",
  setup: () => () => h("style", { "data-comark-typeset": "", innerHTML: typesetCss }),
});

/** Render documents parsed elsewhere without constructing or bundling the parser preset. */
export const components = {
  ...carousel.components,
  ...cast.components,
  ...charts.components,
  ...chips.components,
  ...colors.components,
  ...diagrams.components,
  pele: Mermaid,
  ...embed.components,
  ...github.components,
  ...icon.components,
  ...mark.components,
  ...math.components,
  ...details.components,
  ...links.components,
  ...fileTree.components,
  ...fields.components,
  ...properties.components,
  ...badge.components,
  ...media.components,
  ...metrics.components,
  ...table.components,
  ...cards.components,
  ...qr.components,
  ...sources.components,
  ...steps.components,
  ...tabs.components,
  ...outline.components,
  ...tests.components,
  ...gitGraph.components,
  ...bundle.components,
  ...time.components,
  ...zoom.components,
  ...magicMove.components,
  ...code.components,
  ...codeNotes.components,
  "typeset-styles": typeset,
} satisfies Record<string, Component>;

/** Every plugin with components for `@comark/vue`, which leaves out annotate, comments, diff, and quiz. */
export default (options?: PresetOptions): Preset<Component> =>
  preset<Component>(
    {
      badge,
      cards,
      carousel,
      cast,
      charts,
      chips,
      code,
      codeNotes,
      colors,
      details,
      diagrams,
      embed,
      fields,
      fileTree,
      github,
      icon,
      links,
      magicMove,
      mark,
      math,
      media,
      mermaid,
      metrics,
      outline,
      properties,
      qr,
      sources,
      steps,
      table,
      tabs,
      tests,
      gitGraph,
      bundle,
      time,
      typeset,
      zoom,
    },
    options,
  );
