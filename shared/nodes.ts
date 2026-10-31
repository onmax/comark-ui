import type { ElementNode, Node } from "comark";

// Comark text nodes are strings, elements are arrays, and comments are arrays with a null tag.
export const isElement = (node: Node | undefined): node is ElementNode =>
  Array.isArray(node) && node[0] !== null;

export const childrenOf = ([, , ...rest]: ElementNode): Node[] => rest;
