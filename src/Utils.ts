import { ASTNode } from "./Karacho.ts";

const quoteRE = /^('([^']+)'|"([^"]+)")$/;

export function getValue(path: string, data: Record<string, unknown>) {
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

  if (typeof value === "undefined") {
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
