import * as builtin from "./BuiltInHelpers.ts";

export type ASTTextNode = string;

export interface ASTNodePosition {
  start: number;
  end: number;
}

export interface ASTNodeBase extends ASTNodePosition {
  type: string;
  tag: string;
  key: string;
}

export interface ASTNodeAddition {
  addition?: string;
}

export interface ASTNodeBlockDepth {
  depth: number;
}

export interface ASTRawNode extends ASTNodeBase {
  type: "raw";
}

export interface ASTVariableNode extends ASTNodeBase, ASTNodeAddition {
  type: "variable";
}

export interface ASTPartialNode extends ASTNodeBase, ASTNodeBlockDepth {
  type: "partial";
}

export interface ASTHelperNode
  extends ASTNodeBase, ASTNodeAddition, ASTNodeBlockDepth {
  type: "helper";
}

// export interface ASTCustomNode<Type extends string = string>
//   extends ASTNodeBase {
//   type: Type;
// }

// export type ASTCustomObjectNode<Type extends string = string> =
//   | ASTCustomNode<Type>
//   | ASTCustomNode<Type> & (ASTNodeAddition | ASTNodeBlockDepth);

export interface ASTCloseNode extends ASTNodeBase, ASTNodeBlockDepth {
  type: "close";
}

export type ASTObjectNode =
  | ASTVariableNode
  | ASTRawNode
  | ASTPartialNode
  | ASTHelperNode
  | ASTCloseNode;

export type ASTNode = ASTTextNode | ASTObjectNode;

export type ASTTagHandler = (
  template: string,
  start: number,
  end: number,
) => ASTObjectNode | void;

export interface BartOptions {
  escape: string;

  delimiters: [string, string];
  rawDelimiters: [string, string];
  helperDelimiters: [string, string];
  partialDelimiters: [string, string];
  closeDelimiters: [string, string];
  partials?: PartialNodes;
}

export type InternalHelper = (
  data: Record<string, unknown>,
  node: ASTHelperNode,
  subAst: ASTNode[],
) => string;

// deno-lint-ignore no-explicit-any
export type Helper<Args extends any[]> = (
  content: string,
  ...args: Args
) => string;

export type InternalPartialNode = ASTNode[];
export type PartialNode = string | ASTNode[];
export type PartialNodes = Record<string, PartialNode>;

export class Bart {
  readonly #depthMap = new Map<string, number>();

  readonly options: BartOptions;
  readonly partials = new Map<string, InternalPartialNode>();
  readonly helpers = new Map<string, InternalHelper>([
    ["if", builtin.ifHelper],
    ["each", builtin.eachHelper],
    ["with", builtin.withHelper],
    ["set", builtin.setHelper],
  ]);
  readonly tags = new Set<ASTTagHandler>();

  constructor(options: Partial<BartOptions> = {}) {
    this.options = {
      escape: "\\",

      delimiters: ["{{", "}}"],
      rawDelimiters: ["{", "}"],
      helperDelimiters: ["#", ""],
      partialDelimiters: [">", ""],
      closeDelimiters: ["/", ""],

      ...options,
    };
    if (this.options.partials) {
      this.registerPartials(this.options.partials);
    }

    this.tags.add(this.#raw);
    this.tags.add(this.#helpers);
    this.tags.add(this.#partials);
    this.tags.add(this.#close);
    this.tags.add(this.#variable);
  }

  registerPartials(partials: PartialNodes) {
    for (const [name, partial] of Object.entries(partials)) {
      if (Array.isArray(partial)) {
        this.partials.set(name, partial);
      } else {
        this.partials.set(name, this.parse(partial));
      }
    }
  }

  // deno-lint-ignore no-explicit-any
  registerHelper<Args extends any[]>(key: string, helper: Helper<Args>) {
    this.helpers.set(key, (data, node, subAst: ASTNode[]) => {
      // use regex to parse arguments with and without quotes
      const args = node.addition?.match(/(?:[^\s"]+|"[^"]*")+/g) ?? [];
      const parsedArgs = args.map((arg) => {
        if (arg.startsWith('"') && arg.endsWith('"')) {
          return arg.slice(1, -1);
        }
        return data[arg];
      }) as Args;

      const content = this.execute(subAst, data);
      return helper(content, ...parsedArgs);
    });
  }

  parse(template: string) {
    const ast: ASTNode[] = [];
    const [delimiterStart, delimiterEnd] = this.options.delimiters;

    let current = 0;
    while (current < template.length) {
      // find start and end of tag
      let start = template.indexOf(delimiterStart, current);
      let end = template.indexOf(delimiterEnd, start);
      if (start === -1 || end === -1) {
        break;
      }

      // TODO: escape delimiters is not working, fix it!

      // increase start if the start delimiter is escaped
      const escapedStart = template.slice(start - 1, start);
      if (escapedStart === this.options.escape) {
        start = template.indexOf(delimiterStart, start + delimiterStart.length);
        if (start === -1) {
          break;
        }
      }

      // increase end if the end delimiter is escaped
      const escapedEnd = template.slice(end - 1, end);
      if (escapedEnd === this.options.escape) {
        end = template.indexOf(delimiterEnd, end + delimiterEnd.length);
        if (end === -1) {
          break;
        }
      }

      // write text node to AST
      const text = template.slice(current, start);
      if (text) {
        ast.push(text);
      }

      // write tag node to AST
      inner:
      for (const handleTag of this.tags) {
        const node = handleTag(template, start, end);
        if (node) {
          ast.push(node);
          current = node.end;
          break inner;
        }
      }
    }

    if (current < template.length) {
      const text = template.slice(current);
      if (text) {
        ast.push(text);
      }
    }

    return ast;
  }

  #getDelimiters([prefix, suffix]: [string, string] = ["", ""]) {
    const [delimiterStart, delimiterEnd] = this.options.delimiters;
    return [delimiterStart + prefix, suffix + delimiterEnd];
  }

  #raw = (template: string, start: number, end: number): ASTRawNode | void => {
    const [startDelimiter, endDelimiter] = this.#getDelimiters(
      this.options.rawDelimiters,
    );
    end = end + endDelimiter.length;

    const tag = template.slice(start, end);
    if (tag.startsWith(startDelimiter) && tag.endsWith(endDelimiter)) {
      const key = tag.slice(startDelimiter.length, -endDelimiter.length);
      return { type: "raw", key, tag, start, end };
    }
  };

  #variable = (
    template: string,
    start: number,
    end: number,
  ): ASTVariableNode => {
    const [delimiterStart, delimiterEnd] = this.#getDelimiters();
    end = end + delimiterEnd.length;

    const tag = template.slice(start, end);
    const content = tag.slice(delimiterStart.length, -delimiterEnd.length);
    const key = /^(\w[\w\d_.\[\]]+)/.exec(content)?.[1] ?? "";
    const node: ASTVariableNode = { type: "variable", key, tag, start, end };
    const addition = content.slice(key.length).trim();
    if (addition) {
      node.addition = addition;
    }
    return node;
  };

  #helpers = (
    template: string,
    start: number,
    end: number,
  ): ASTHelperNode | void => {
    const [startDelimiter, endDelimiter] = this.#getDelimiters(
      this.options.helperDelimiters,
    );
    const [prefix] = this.options.helperDelimiters;
    end = end + endDelimiter.length;

    const tag = template.slice(start, end);
    if (tag.startsWith(startDelimiter) && tag.endsWith(endDelimiter)) {
      const content = tag.slice(startDelimiter.length, -endDelimiter.length);

      // fill key with the first word of the content
      const keyRE = /^(\w[\w\d\_]+)/;
      const key = keyRE.exec(content)?.[1] ?? "";
      const depth = this.#depthMap.get(key) || 0;
      this.#depthMap.set(key, depth + 1);
      const node: ASTHelperNode = {
        type: "helper",
        key,
        tag,
        start,
        end,
        depth,
      };
      const addition = content.slice(key.length + prefix.length).trim();
      if (addition) {
        node.addition = addition;
      }
      return node;
    }
  };

  #partials = (
    template: string,
    start: number,
    end: number,
  ): ASTPartialNode | void => {
    const [startDelimiter, endDelimiter] = this.#getDelimiters(
      this.options.partialDelimiters,
    );
    end = end + endDelimiter.length;

    const tag = template.slice(start, end);
    if (tag.startsWith(startDelimiter) && tag.endsWith(endDelimiter)) {
      const key = tag.slice(startDelimiter.length, -endDelimiter.length).trim();
      const depth = this.#depthMap.get(key) || 0;
      this.#depthMap.set(key, depth + 1);
      return { type: "partial", key, tag, depth, start, end };
    }
  };

  #close = (
    template: string,
    start: number,
    end: number,
  ): ASTCloseNode | void => {
    const [startDelimiter, endDelimiter] = this.#getDelimiters(
      this.options.closeDelimiters,
    );
    end = end + endDelimiter.length;

    const tag = template.slice(start, end);
    if (tag.startsWith(startDelimiter) && tag.endsWith(endDelimiter)) {
      const key = tag.slice(startDelimiter.length, -endDelimiter.length).trim();

      if (!this.#depthMap.has(key)) {
        throw new Error(`Unexpected close tag: ${tag}`);
      }

      const depth = this.#depthMap.get(key) as number - 1 || 0;
      if (depth < 0) {
        this.#depthMap.delete(key);
      } else {
        this.#depthMap.set(key, depth);
      }

      return { type: "close", key, tag, depth, start, end };
    }
  };

  execute(ast: ASTNode[], data: Record<string, unknown>) {
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
          result += this.execute(partial, data);
        } else {
          // create an AST from the global AST inside the partial block without the end tag
          const altAST = ast.slice(i + 1, endIndex + i + 1);
          result += this.execute(altAST, data);
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

  compile(template: string, options: Partial<BartOptions> = {}) {
    if (options.partials) {
      this.registerPartials(options.partials);
    }
    const ast = this.parse(template);
    return (data: Record<string, unknown>) => {
      const result = this.execute(ast, data);
      return result;
    };
  }

  #getValue(path: string, data: Record<string, unknown>) {
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
    return value;
  }
}
