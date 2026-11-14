import { componentInfo as annotate } from "comark-annotate/info";
import { componentInfo as badge } from "comark-badge/info";
import { componentInfo as bundle } from "comark-bundle/info";
import { componentInfo as cards } from "comark-cards/info";
import { componentInfo as carousel } from "comark-carousel/info";
import { componentInfo as cast } from "comark-cast/info";
import { componentInfo as charts } from "comark-charts/info";
import { componentInfo as chips } from "comark-chips/info";
import { componentInfo as colors } from "comark-colors/info";
import { componentInfo as comments } from "comark-comments/info";
import { componentInfo as details } from "comark-details/info";
import { componentInfo as diff } from "comark-diff/info";
import { componentInfo as embed } from "comark-embed/info";
import { componentInfo as fields } from "comark-fields/info";
import { componentInfo as fileTree } from "comark-file-tree/info";
import { componentInfo as gitGraph } from "comark-git-graph/info";
import { componentInfo as callouts } from "comark-github/info";
import { componentInfo as icon } from "comark-icon/info";
import { componentInfo as include } from "comark-include/info";
import { componentInfo as magicMove } from "comark-magic-move/info";
import { componentInfo as metrics } from "comark-metrics/info";
import { componentInfo as outline } from "comark-outline/info";
import { componentInfo as properties } from "comark-properties/info";
import { componentInfo as qr } from "comark-qr/info";
import { componentInfo as quiz } from "comark-quiz/info";
import { componentInfo as sources } from "comark-sources/info";
import { componentInfo as steps } from "comark-steps/info";
import { componentInfo as table } from "comark-table/info";
import { componentInfo as tabs } from "comark-tabs/info";
import { componentInfo as tests } from "comark-tests/info";
import { componentInfo as time } from "comark-time/info";
import { componentInfo as xref } from "comark-xref/info";
import { componentInfo as zoom } from "comark-zoom/info";
import type { ComponentInfo } from "../../../shared/component-info.ts";
import type { PresetOptions } from "./index.ts";

export type { ComponentInfo, ComponentProp } from "../../../shared/component-info.ts";

// Each package's blocks, by the preset option that turns it on. GitHub's are its callout blocks, read apart below.
const INFO: [keyof PresetOptions, Record<string, ComponentInfo>][] = [
  ["include", include],
  ["annotate", annotate],
  ["carousel", carousel],
  ["cast", cast],
  ["charts", charts],
  ["chips", chips],
  ["colors", colors],
  ["diff", diff],
  ["embed", embed],
  ["icon", icon],
  ["details", details],
  ["fileTree", fileTree],
  ["fields", fields],
  ["properties", properties],
  ["badge", badge],
  ["metrics", metrics],
  ["table", table],
  ["cards", cards],
  ["qr", qr],
  ["sources", sources],
  ["steps", steps],
  ["quiz", quiz],
  ["tabs", tabs],
  ["magicMove", magicMove],
  ["outline", outline],
  ["xref", xref],
  ["tests", tests],
  ["gitGraph", gitGraph],
  ["bundle", bundle],
  ["time", time],
  ["zoom", zoom],
  ["comments", comments],
];

const off = (value: unknown) => value === false;
const optionsOf = <T>(value: T | boolean | undefined): T | undefined =>
  value === true || value === false ? undefined : value;

/**
 * What an editor shows for each block the preset's plugins read, keyed by its name as written, such as `embed` for
 * `::embed`: a label, a description, its props, and its named slots. Pass the options you give the preset. The map is
 * plain data, so a server can pass it on, and `ComarkEditor` takes it as `components`. A package used alone exports its
 * own as `componentInfo` from its `/info` entry, such as `comark-embed/info`.
 */
export function componentInfo(options: PresetOptions = {}): Record<string, ComponentInfo> {
  const info: Record<string, ComponentInfo> = {};
  for (const [key, blocks] of INFO)
    if (key === "include" ? options.include && !off(options.include) : !off(options[key]))
      Object.assign(info, blocks);
  const github = optionsOf(options.github);
  const calloutOptions = optionsOf(github?.callouts);
  if (!off(options.github) && !off(github?.callouts) && !off(calloutOptions?.blocks))
    Object.assign(info, callouts);
  return info;
}
