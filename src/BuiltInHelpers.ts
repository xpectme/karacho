import { Interpreter } from "./Interpreter.ts";
import { ASTHelperNode, ASTNode } from "./Lexer.ts";

function is(
  index: number,
  keys: string[],
  data: Record<string, unknown>,
): [boolean, number] {
  const prefixOrKey = keys[index];
  if (prefixOrKey === "not") {
    const nextKey = keys[index + 1];
    return [!data[nextKey], 2];
  }
  return [!!data[prefixOrKey], 1];
}

export function ifHelper(
  this: Interpreter,
  data: Record<string, unknown>,
  node: ASTHelperNode,
  subAst: ASTNode[],
) {
  if (!node.addition) {
    return "";
  }

  // parse the addition string
  const addition = node.addition.split(/\s+/);

  // iterate over the addition string and create the condition
  let [condition, incr] = is(0, addition, data);
  for (let i = incr; i < addition.length; i++) {
    const key = addition[i];
    switch (key) {
      case "and": {
        const [result, incr] = is(i + 1, addition, data);
        condition = condition && result;
        i += incr;
        break;
      }
      case "or": {
        const [result, incr] = is(i + 1, addition, data);
        condition = condition || result;
        i += incr;
        break;
      }
    }
  }

  const elseIndex = subAst.findIndex((node) =>
    "string" !== typeof node && node.type === "variable" && node.key === "else"
  );

  // if there is an else block
  if (elseIndex !== -1) {
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
  this: Interpreter,
  data: Record<string, unknown>,
  node: ASTHelperNode,
  subAst: ASTNode[],
) {
  if (!node.addition) {
    return "";
  }

  // parse the addition string
  const [, listName, itemName, , indexName] = node.addition.match(
    /(.*)\s+as\s+([^,]+)(,\s+(.*))?/,
  )!;

  // get the array
  const array = data[listName] as unknown[];

  // iterate over the array and execute the subAst
  let result = "";
  for (let i = 0; i < array.length; i++) {
    const item = array[i];
    result += this.execute(subAst, {
      ...data,
      [itemName ?? "this"]: item,
      [indexName ?? "index"]: i,
    });
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
  this: Interpreter,
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

  const elseIndex = subAst.findIndex((node) =>
    "string" !== typeof node && node.type === "variable" && node.key === "else"
  );

  // if there is an else statement
  if (elseIndex > -1) {
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
