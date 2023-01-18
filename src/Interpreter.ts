import { ASTHelperNode, ASTNode, Lexer, LexerOptions } from "./Lexer.ts";
import * as builtin from "./BuiltInHelpers.ts";

export interface InterpreterOptions {
  lexer?: LexerOptions;
  // ...
}

export type HelperFunction = (
  data: Record<string, unknown>,
  node: ASTHelperNode,
  subAst: ASTNode[],
) => string;

export class Interpreter {
  readonly options: InterpreterOptions;
  readonly lexer: Lexer;

  readonly partials = new Map<string, ASTNode[]>();
  readonly helpers = new Map<string, HelperFunction>([
    ["if", builtin.ifHelper],
    ["each", builtin.eachHelper],
    ["with", builtin.withHelper],
    ["set", builtin.setHelper],
  ]);

  constructor(options: Partial<InterpreterOptions> = {}) {
    this.options = { ...options };
    this.lexer = new Lexer(this.options.lexer);
  }

  registerPartials(partials: Record<string, string | ASTNode[]>) {
    for (const [name, partial] of Object.entries(partials)) {
      if (Array.isArray(partial)) {
        this.partials.set(name, partial);
      } else {
        this.partials.set(name, this.lexer.tokenize(partial));
      }
    }
  }

  executeAST(
    ast: ASTNode[],
    data: Record<string, unknown>,
    partials?: Record<string, string | ASTNode[]>,
  ) {
    if (partials) {
      this.registerPartials(partials);
    }

    let result = "";
    let i = 0;
    while (i < ast.length) {
      const node = ast[i];
      if (typeof node === "string") {
        result += node;
      } else if (node.type === "variable") {
        // value must be HTML escaped
        result += this.#getValue(node.key, data)!.toString()
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#39;");
      } else if (node.type === "raw") {
        // value must be HTML escaped
        result += this.#getValue(node.key, data);
      } else if (node.type === "partial") {
        // find a close tag to the partial
        const endIndex = ast.slice(i + 1).findIndex((otherNode) =>
          "string" !== typeof otherNode && otherNode.type === "close" &&
          node.key === otherNode.key && node.depth === otherNode.depth
        );
        if (this.partials.has(node.key)) {
          const partial = this.partials.get(node.key)!;
          result += this.executeAST(partial, data);
        } else {
          // create an AST from the global AST inside the partial block without the end tag
          const altAST = ast.slice(i + 1, endIndex + i + 1);
          result += this.executeAST(altAST, data);
          console.info(`Partial "${node.key}" not defined`);
        }
        if (endIndex > -1) {
          i = endIndex + i + 1;
          continue;
        }
      } else if (node.type === "helper") {
        // find a close tag to the helper
        const endIndex = ast.slice(i + 1).findIndex((otherNode) =>
          "string" !== typeof otherNode && otherNode.type === "close" &&
          node.key === otherNode.key && node.depth === otherNode.depth
        );
        // create an AST from the global AST inside the helper block without the end tag
        const helperAST = ast.slice(i + 1, endIndex + i + 1);
        if (this.helpers.has(node.key)) {
          const helper = this.helpers.get(node.key)!;
          result += helper.call(this, data, node, helperAST);
          if (endIndex > -1) {
            i = endIndex + i + 1;
            continue;
          }
        } else {
          console.warn(`Helper "${node.key}" not found`);
        }
      }
      i++;
    }

    return result;
  }

  compile(template: string, partials?: Record<string, string | ASTNode[]>) {
    if (partials) {
      this.registerPartials(partials);
    }
    const ast = this.lexer.tokenize(template);
    return (data: Record<string, unknown>) => {
      const result = this.executeAST(ast, data);
      return result;
    };
  }

  #getValue(path: string, data: Record<string, unknown>) {
    // keys can indicate properties of an object
    const keys = path.match(/(\w[\w\d_]*|\d+)+/g);

    if (keys === null) {
      return undefined;
    }

    let value = data[keys[0]] as Record<string, unknown>;
    for (let i = 1; i < keys.length; i++) {
      if (typeof value !== "object" || value === null) {
        return undefined;
      }
      value = value[keys[i]] as Record<string, unknown>;
    }
    return value;
  }
}
