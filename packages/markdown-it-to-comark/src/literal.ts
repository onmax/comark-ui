import { parseSync, type Node } from "oxc-parser";

export type Literal = string | number | boolean | null | Literal[] | { [key: string]: Literal };

/**
 * The value of an option written as a literal (`true`, `"tip"`, `{ marker: "!" }`), read from its AST so no project
 * code runs. Inside an object, a property that isn't a literal (a `render` function) is left out; `undefined` when
 * the whole value isn't one.
 */
export function literal(text: string): Literal | undefined {
  try {
    const statement = parseSync("value.ts", `(${text})`).program.body[0];
    if (statement?.type !== "ExpressionStatement") return undefined;
    return value(statement.expression, true);
  } catch {
    return undefined;
  }
}

function value(node: Node, top: boolean): Literal | undefined {
  switch (node.type) {
    case "ParenthesizedExpression":
      return value(node.expression, top);
    case "Literal":
      return node.value === null ||
        node.value === true ||
        node.value === false ||
        node.value === String(node.value) ||
        node.value === Number(node.value)
        ? node.value
        : undefined;
    case "TemplateLiteral":
      return node.expressions.length ? undefined : (node.quasis[0]?.value.cooked ?? undefined);
    case "UnaryExpression":
      return node.operator === "-" &&
        node.argument.type === "Literal" &&
        node.argument.value === Number(node.argument.value)
        ? -node.argument.value
        : undefined;
    case "ArrayExpression": {
      const items: Literal[] = [];
      for (const item of node.elements) {
        const found = item && item.type !== "SpreadElement" ? value(item, false) : undefined;
        if (found === undefined) return undefined;
        items.push(found);
      }
      return items;
    }
    case "ObjectExpression": {
      const object: Record<string, Literal> = {};
      for (const property of node.properties) {
        if (property.type !== "Property" || property.computed) {
          if (!top) return undefined;
          continue;
        }
        const key =
          property.key.type === "Identifier"
            ? property.key.name
            : property.key.type === "Literal"
              ? String(property.key.value)
              : undefined;
        const found = key === undefined ? undefined : value(property.value, false);
        if (found === undefined) {
          if (!top) return undefined;
          continue;
        }
        object[key!] = found;
      }
      return object;
    }
  }
  return undefined;
}
