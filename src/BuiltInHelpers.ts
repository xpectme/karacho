import { ASTHelperNode, ASTNode, Bart } from "./Bart.ts";
import { getElseIndex, getValue } from "./Utils.ts";

const opsRE = /\s+(and|or)\s+/;

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

function is(
  op: string,
  data: Record<string, unknown>,
) {
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
      case "<=":
        return leftValue <= rightValue;
      case ">=":
        return leftValue >= rightValue;
      case "<":
        return leftValue < rightValue;
      case ">":
        return leftValue > rightValue;
    }
  }
  return !!getValue(leftKey, data);
}

export function ifHelper(
  this: Bart,
  data: Record<string, unknown>,
  node: ASTHelperNode,
  subAst: ASTNode[],
) {
  if (!node.addition) {
    return "";
  }

  // parse conditions and operators from the addition string
  const ops = node.addition.split(opsRE);

  // iterate over the addition string and create the condition
  let condition = is(ops[0], data);
  for (let i = 1; i < ops.length; i++) {
    const key = ops[i];
    switch (key) {
      case "and": {
        const result = is(ops[i + 1], data);
        condition = condition && result;
        break;
      }
      case "or": {
        const result = is(ops[i + 1], data);
        condition = condition || result;
        break;
      }
    }
  }

  const elseIndex = getElseIndex(subAst);

  // if there is an else block
  if (elseIndex !== undefined && elseIndex > -1) {
    // if the condition is true
    if (condition) {
      // execute the AST before the else block
      return this.execute(subAst.slice(0, elseIndex), data);
    }

    // execute the AST after the else block
    return this.execute(subAst.slice(elseIndex + 1), data);
  }

  // evaluate the condition
  if (condition) {
    return this.execute(subAst, data);
  }

  return "";
}

export function eachHelper(
  this: Bart,
  data: Record<string, unknown>,
  node: ASTHelperNode,
  subAst: ASTNode[],
) {
  if (!node.addition) {
    return "";
  }

  // parse the addition string

  // parse the addition string and extract listName, itemName, keyName, indexName
  const [listName, rest] = node.addition.split(/\s+as\s+/);
  const [itemName = "this", keyName = "key", indexName = "index"] = rest.split(
    /\s*,\s*/,
  );

  // get the array
  const map = new Map(
    Object.entries(
      data[listName] as Record<string | number | symbol, unknown> | unknown[],
    ),
  );

  // else case
  const elseIndex = getElseIndex(subAst);

  if (map.size === 0) {
    // if there is an else statement
    if (elseIndex !== undefined && elseIndex > -1) {
      // get the else ast
      const elseAst = subAst.slice(elseIndex + 1);

      // execute the else ast
      return this.execute(elseAst, data);
    }
    return "";
  }

  const eachSubAst = subAst.slice(
    0,
    elseIndex !== undefined ? elseIndex : undefined,
  );

  // iterate over the array and execute the subAst
  let result = "";
  let index = 0;
  for (const [key, value] of map) {
    const newData = { ...data, [itemName]: value };
    if (keyName === indexName) {
      newData[indexName] = index;
    } else {
      newData[keyName] = key;
      newData[indexName] = index;
    }

    result += this.execute(eachSubAst, newData);
    index++;
  }

  return result;
}

export function setHelper(
  data: Record<string, unknown>,
  node: ASTHelperNode,
) {
  if (!node.addition) {
    return "";
  }

  // parse the addition string
  const [, key, value] = node.addition.match(/(\w[\w\d_]+)\s*=\s*(.*)/)!;

  // set the value
  data[key] = value;

  return "";
}

export function withHelper(
  this: Bart,
  data: Record<string, unknown>,
  node: ASTHelperNode,
  subAst: ASTNode[],
) {
  if (!node.addition) {
    return "";
  }

  // parse the addition string
  const key = node.addition;
  const newData = data[key] as Record<string, unknown>;
  const elseIndex = getElseIndex(subAst);

  // if there is an else statement
  if (elseIndex !== undefined && elseIndex > -1) {
    // get the else ast
    const elseAst = subAst.slice(elseIndex + 1);

    // if the data is falsy
    if (!newData) {
      // execute the else ast
      return this.execute(elseAst, data);
    } else {
      // get the sub ast
      subAst = subAst.slice(0, elseIndex);
    }
  }

  // execute the subAst
  return this.execute(subAst, { ...newData });
}
