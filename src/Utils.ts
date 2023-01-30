import { ASTNode } from "./Karacho.ts";

const quoteRE = /^('([^']+)'|"([^"]+)")$/;

export function getValue(
  path: string,
  data: Record<string, unknown>,
  throws = false,
): string | number | Record<string, unknown> | undefined {
  if (quoteRE.test(path)) {
    return path.slice(1, -1);
  }

  const number = Number(path);
  if (!isNaN(number)) {
    return number;
  }

  // keys can indicate properties of an object
  const keys = path.match(/(\w[\w\d_]*|\d+)+/g);

  if (keys === null) {
    return "";
  }

  let value = data[keys[0]] as Record<string, unknown>;
  for (let i = 1; i < keys.length; i++) {
    if (typeof value !== "object" || value === null) {
      return "";
    }
    value = value[keys[i]] as Record<string, unknown>;
  }

  if (typeof value === "undefined" && throws) {
    throw new Error(`Key ${path} not found in data`);
  }

  return value;
}

export function getElseIndex(subAst: ASTNode[]) {
  let endLeft = subAst.length;
  for (let i = 0; i < subAst.length; i++) {
    const node = subAst[i];
    if (
      "string" !== typeof node &&
      (node.type === "helper" || node.type === "partial")
    ) {
      endLeft = i;
      break;
    }
  }

  let startRight = 0;
  for (let i = subAst.length - 1; i >= 0; i--) {
    const node = subAst[i];
    if (
      "string" !== typeof node &&
      (node.type === "close" || node.type === "helper" ||
        node.type === "partial")
    ) {
      startRight = i + 1;
      break;
    }
  }

  // iterate over the subAst and find the else case between 0 and endLeft
  for (let i = 0; i < endLeft; i++) {
    const node = subAst[i];
    if (
      "string" !== typeof node &&
      node.type === "variable" &&
      node.key === "else"
    ) {
      return i;
    }
  }

  // iterate over the subAst and find the else case between startRight and subAst.length
  for (let i = startRight; i < subAst.length; i++) {
    const node = subAst[i];
    if (
      "string" !== typeof node &&
      node.type === "variable" &&
      node.key === "else"
    ) {
      return i;
    }
  }

  return undefined;
}

const keyRE = "\\w[\\w\\d_\\.\\[\\]]+";
const doubleQuoteRE = '(?:[^\\s"]+|"[^"]*")';
const singleQuoteRE = "(?:[^\\s']+|'[^']*')";
const compareOpRE = "\\s*(==|!=|<=|>=|<|>)\\s*";

const compareRE = new RegExp(
  `^(${keyRE}|${doubleQuoteRE}|${singleQuoteRE})` +
    "(" +
    `${compareOpRE}` +
    `(${keyRE}|${doubleQuoteRE}|${singleQuoteRE})` +
    ")?$",
);

const notRE = /^not\s+(\w[\w\d_]+)/;

export function is(op: string, data: Record<string, unknown>) {
  if (op.startsWith("not")) {
    const [, negatable] = op.match(notRE) ?? [];
    const result = !!data[negatable];
    return !result;
  }

  // parse for comparison operators
  const [, leftKey, , operator, rightKey] = op.match(compareRE) ?? [];

  // if there is a comparison operator
  if (operator) {
    const leftValue = getValue(leftKey, data);
    const rightValue = getValue(rightKey, data);

    switch (operator) {
      case "==":
        return leftValue === rightValue;
      case "!=":
        return leftValue !== rightValue;
      default: {
        if (
          typeof leftValue !== "undefined" && typeof rightValue !== "undefined"
        ) {
          switch (operator) {
            case "<":
              return leftValue < rightValue;
            case "<=":
              return leftValue <= rightValue;
            case ">":
              return leftValue > rightValue;
            case ">=":
              return leftValue >= rightValue;
          }
        } else {
          if (typeof leftValue === "undefined") {
            throw new Error(`Key ${leftKey} not found in data`);
          }
          if (typeof rightValue === "undefined") {
            throw new Error(`Key ${rightKey} not found in data`);
          }
        }
      }
    }
  }
  return !!getValue(leftKey, data);
}

export class ASTError extends Error {
  constructor(error: Error | string, public node: ASTNode) {
    super(error instanceof Error ? error.message : error);
  }
}
