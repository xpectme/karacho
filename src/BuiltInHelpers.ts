import { ASTHelperNode, ASTNode, Karacho } from "./Karacho.ts";
import { eachLoop } from "./regex.ts";
import { ASTError, getValue, is, reservedWord, setValue } from "./Utils.ts";

const opsRE = /\s+(and|x?or)\s+/;

export function ifHelper(
  this: Karacho,
  data: Record<string, unknown>,
  node: ASTHelperNode,
  subAst: ASTNode[],
) {
  if (!node.addition) {
    return "";
  }

  const debug = this.options.debug;

  // parse conditions and operators from the addition string
  const ops = node.addition.split(opsRE);

  try {
    // iterate over the addition string and create the condition
    let condition = is(ops[0], data, debug);
    for (let i = 1; i < ops.length; i++) {
      const key = ops[i];
      switch (key) {
        case "and": {
          const result = is(ops[i + 1], data, debug);
          condition = condition && result;
          break;
        }
        case "or": {
          const result = is(ops[i + 1], data, debug);
          condition = condition || result;
          break;
        }
        case "xor": {
          const result = is(ops[i + 1], data, debug);
          condition = condition !== result;
          break;
        }
      }
    }

    const elseIndex = reservedWord(subAst, "else");

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
  } catch (e) {
    throw new ASTError(e, node);
  }
}

export function eachHelper(
  this: Karacho,
  data: Record<string, unknown>,
  node: ASTHelperNode,
  subAst: ASTNode[],
) {
  if (!node.addition) {
    return "";
  }

  const debug = this.options.debug;

  // parse the addition string and extract listName, itemName, keyName, indexName
  let [, valueName, keyName, indexName, listName] =
    node.addition.match(eachLoop) ?? [];
  listName = listName ?? node.addition.match(/^\w+$/)?.[0] ?? undefined;

  if (!listName) {
    throw new ASTError("Invalid each statement", node);
  }

  const object = getValue(listName, data, debug);
  if (!object) {
    debug?.(`Key ${listName} not found in data`);
    return "";
  }

  // get the array
  const map = new Map(Object.entries(object));

  // else case
  const elseIndex = reservedWord(subAst, "else");

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
    let newData: Record<string, unknown> = {};

    if (!valueName) {
      if (typeof value === "object") {
        newData = { ...data, ...value };
      } else {
        newData = { ...data, ["$this"]: value };
      }
    } else {
      newData = { ...data, [valueName]: value };
    }

    if (!keyName && indexName) {
      keyName = indexName;
    }

    newData[keyName ?? "$key"] = key.toString();
    newData[indexName ?? "$index"] = index.toString();

    result += this.execute(eachSubAst, newData);
    index++;
  }

  return result;
}

export function setHelper(
  this: Karacho,
  data: Record<string, unknown>,
  node: ASTHelperNode,
  subAst: ASTNode[],
) {
  const hasSubAst = subAst.length > 0;

  // If this is no set block, then the data object will be mutated
  data = setValue(data, node.addition, { overwrite: true, mutate: !hasSubAst });

  // Otherwise the data object will not be mutated and only affect the subAst
  if (hasSubAst) {
    return this.execute(subAst, data);
  }
  return "";
}

/**
 * Set the value of a key if it is not already set
 * @param data
 * @param node
 * @returns
 */
export function defaultHelper(
  this: Karacho,
  data: Record<string, unknown>,
  node: ASTHelperNode,
  subAst: ASTNode[],
) {
  const hasSubAst = subAst.length > 0;

  // If this is no set block, then the data object will be mutated
  data = setValue(data, node.addition, {
    overwrite: false,
    mutate: !hasSubAst,
  });

  // Otherwise the data object will not be mutated and only affect the subAst
  if (hasSubAst) {
    return this.execute(subAst, data);
  }
  return "";
}

export function withHelper(
  this: Karacho,
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
  const elseIndex = reservedWord(subAst, "else");

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
