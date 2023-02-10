import { ASTNode } from "./Karacho.ts";

const keyRE = "\\w[\\w\\d_\\.\\[\\]]+";
const doubleQuoteRE = '(?:[^\\s"]+|"[^"]*")';
const singleQuoteRE = "(?:[^\\s']+|'[^']*')";
const compareOpRE = "\\s*(==|!=|<=|>=|<|>)\\s*";
const notRE = /^not\s+(\w[\w\d_]+)/;
const compareRE = new RegExp(
  `^(${keyRE}|${doubleQuoteRE}|${singleQuoteRE})` +
    "(" +
    `${compareOpRE}` +
    `(${keyRE}|${doubleQuoteRE}|${singleQuoteRE})` +
    ")?$",
);
const quoteRE = /^('([^']+)'|"([^"]+)")$/;

export const formatHTML = (html: unknown) =>
  (html || "").toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export function getValue(
  path: string,
  data: Record<string, unknown>,
  debug?: (message: string) => void,
): string | number | Record<string, unknown> | undefined {
  if (quoteRE.test(path)) {
    return path.slice(1, -1);
  }

  const number = Number(path);
  if (!isNaN(number)) {
    return number;
  }

  // keys can indicate properties of an object
  const keys = path.match(/(\$?\w[\w\d_]*|\d+)+/g);

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

  if (typeof value === "undefined") {
    debug?.(`Key ${path} not found in data`);
  }

  return value;
}

export interface SetValueOptions {
  overwrite?: boolean;
  mutate?: boolean;
  reserved?: boolean;
}

export function setValue(
  data: Record<string, unknown>,
  rawArgs: string | undefined,
  options: SetValueOptions = {
    overwrite: true,
    mutate: false,
    reserved: false,
  },
) {
  if (rawArgs === undefined || rawArgs === "") {
    return data;
  }

  // comma separated list of key-value pairs (key=value)
  const args = rawArgs.split(/,\s*/g);
  const kv = new Map();

  for (const arg of args) {
    const [key, value] = arg.split(/\s*=\s*/g);
    kv.set(key, getValue(value, data));
  }

  const result = options.mutate ? data : { ...data };

  const keyRegex = options.reserved
    ? /(\$?\w[\w\d_]*|\d+)+/g
    : /(\w[\w\d_]*|\d+)+/g;

  for (const [key, value] of kv) {
    const keys = key.match(keyRegex);
    if (keys === null) {
      continue;
    }

    let obj = result;
    for (let i = 0; i < keys.length - 1; i++) {
      if (typeof obj[keys[i]] !== "object" || obj[keys[i]] === null) {
        obj[keys[i]] = {};
      }
      obj = obj[keys[i]] as Record<string, unknown>;
    }

    const lastKey = keys[keys.length - 1];
    if (options.overwrite || obj[lastKey] === undefined) {
      obj[lastKey] = value;
    }
  }

  return result;
}

export function reservedWord(
  subAst: ASTNode[],
  word: string,
  types: string[] = ["helper", "partial"],
) {
  let endLeft = subAst.length;
  for (let i = 0; i < subAst.length; i++) {
    const node = subAst[i];
    if (
      "string" !== typeof node &&
      types.includes(node.type)
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
      (node.type === "close" || types.includes(node.type))
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
      node.key === word
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
      node.key === word
    ) {
      return i;
    }
  }

  return undefined;
}

export function is(
  op: string,
  data: Record<string, unknown>,
  debug?: (message: string) => void,
) {
  if (op.startsWith("not")) {
    const [, negatable] = op.match(notRE) ?? [];
    return !data[negatable];
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
            debug?.(`Key ${leftKey} not found in data`);
            return false;
          }
          if (typeof rightValue === "undefined") {
            debug?.(`Key ${rightKey} not found in data`);
            return false;
          }
        }
      }
    }
  }

  const value = getValue(leftKey, data);
  return Boolean(value);
}

export class ASTError extends Error {
  constructor(error: Error | string, public node: ASTNode) {
    super(error instanceof Error ? error.message : error);
  }
}
