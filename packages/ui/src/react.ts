import { type ComponentType, createElement } from "react";
import * as badge from "comark-badge/react";
import * as cards from "comark-cards/react";
import * as carousel from "comark-carousel/react";
import * as cast from "comark-cast/react";
import * as charts from "comark-charts/react";
import * as chips from "comark-chips/react";
import * as code from "comark-code/react";
import * as codeNotes from "comark-code-notes/react";
import * as colors from "comark-colors/react";
import * as details from "comark-details/react";
import * as diagrams from "comark-diagrams/react";
import * as embed from "comark-embed/react";
import * as fields from "comark-fields/react";
import * as fileTree from "comark-file-tree/react";
import * as github from "comark-github/react";
import * as icon from "comark-icon/react";
import * as links from "comark-links/react";
import * as mark from "comark-mark/react";
import * as math from "comark-mathml/react";
import * as media from "comark-media/react";
import pele, { createPeleComponent } from "comark-pele/react";
import * as metrics from "comark-metrics/react";
import * as outline from "comark-outline/react";
import * as properties from "comark-properties/react";
import * as qr from "comark-qr/react";
import * as sources from "comark-sources/react";
import * as steps from "comark-steps/react";
import * as table from "comark-table/react";
import * as tabs from "comark-tabs/react";
import * as tests from "comark-tests/react";
import * as zoom from "comark-zoom/react";
import { addMermaidStyles } from "./client.ts";
import { type Preset, type PresetOptions, preset } from "./index.ts";
import { typesetCss } from "./typeset-css.ts";

export { criticCss } from "./index.ts";
export type { PresetOptions } from "./index.ts";

// Pele calls `onRender` only in the browser, after it draws, so the styles arrive like the other components' do.
const mermaid = {
  default: pele,
  components: { pele: createPeleComponent({ onRender: addMermaidStyles }) },
};

// oxlint-disable-next-line no-explicit-any -- the type `@comark/react` takes for its components.
type AnyComponent = ComponentType<any>;

// Rendered with the document rather than added on mount, so `@scope` styles its root and server renders arrive styled.
const typeset = () =>
  createElement("style", {
    "data-comark-typeset": "",
    dangerouslySetInnerHTML: { __html: typesetCss },
  });

/** Every plugin with components for `@comark/react`, which leaves out annotate, diff, and quiz. */
export default (options?: PresetOptions): Preset<AnyComponent> =>
  preset<AnyComponent>(
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
      typeset,
      zoom,
    },
    options,
  );
