import type { Component } from "svelte";
import type { QrAttributes } from "comark-qr";

export { default } from "comark-qr";
export type { QrAttributes, QrMeta } from "comark-qr";

export declare const Qr: Component<QrAttributes>;
export declare const components: { Qr: typeof Qr };
