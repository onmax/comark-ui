import type { Component } from "svelte";
import type { DiagramAttributes } from "comark-diagrams";

export { default, LANGUAGES, sanitizeSvg } from "comark-diagrams";
export type { DiagramAttributes, DiagramsMeta, DiagramsOptions } from "comark-diagrams";

export declare const Diagram: Component<DiagramAttributes>;
export declare const components: { Diagram: typeof Diagram };
