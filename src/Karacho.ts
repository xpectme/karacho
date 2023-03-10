import * as builtin from "./BuiltInHelpers.ts";
import { formatHTML, getValue, reservedWord, setValue } from "./Utils.ts";

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

export interface ASTPartialNode
  extends ASTNodeBase, ASTNodeAddition, ASTNodeBlockDepth {
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

export interface ASTCommentNode extends ASTNodeBase {
  type: "comment";
}

export type ASTObjectNode =
  | ASTVariableNode
  | ASTRawNode
  | ASTPartialNode
  | ASTHelperNode
  | ASTCloseNode
  | ASTCommentNode;

export type ASTNode = ASTTextNode | ASTObjectNode;

export type ASTTagHandler = (
  template: string,
  start: number,
  end: number,
) => ASTObjectNode | void;

export interface KarachoOptions {
  escape: string;

  delimiters: [string, string];
  rawDelimiters: [string, string];
  helperDelimiters: [string, string];
  partialDelimiters: [string, string];
  closeDelimiters: [string, string];
  commentDelimiters: [string, string];
  blockCommentDelimiters: [string, string];
  partials?: PartialNodes;
  debug?: (message: string) => void;
}

export type InternalHelper = (
  data: Record<string, unknown>,
  node: ASTHelperNode,
  subAst: ASTNode[],
) => string;

// deno-lint-ignore no-explicit-any
export type Helper<Args extends any[]> = (...args: Args) => string;

export type InternalPartialNode = ASTNode[];
export type PartialNode = string | ASTNode[];
export type PartialNodes = Record<string, PartialNode>;

export class Karacho {
  readonly #depthMap = new Map<string, number>();

  readonly options: KarachoOptions;
  readonly partials = new Map<string, InternalPartialNode>();
  readonly helpers = new Map<string, InternalHelper>([
    ["if", builtin.ifHelper],
    ["each", builtin.eachHelper],
    ["for", builtin.eachHelper],
    ["with", builtin.withHelper],
    ["set", builtin.setHelper],
    ["default", builtin.defaultHelper],
  ]);
  readonly tags = new Set<ASTTagHandler>();

  constructor(options: Partial<KarachoOptions> = {}) {
    this.options = {
      escape: "\\",

      delimiters: ["{{", "}}"],
      rawDelimiters: ["{", "}"],
      helperDelimiters: ["#", ""],
      partialDelimiters: [">", ""],
      closeDelimiters: ["/", ""],
      commentDelimiters: ["!", ""],
      blockCommentDelimiters: ["!--", "--"],

      ...options,
    };
    if (this.options.partials) {
      this.registerPartials(this.options.partials);
    }

    this.tags.add(this.#raw);
    this.tags.add(this.#helpers);
    this.tags.add(this.#partials);
    this.tags.add(this.#close);
    this.tags.add(this.#comment);
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
      const values = node.addition?.split(/\s*,\s*/) ?? [];
      const parsedValues = values.map((value) => {
        return getValue(value, data);
      }) as Args;

      const content = this.execute(subAst, data);
      if (content) {
        const args = [...parsedValues, content] as Args;
        return helper(...args);
      }
      return helper(...parsedValues);
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
        current = start;
        continue;
      }

      // handle block comment first if it is a block comment
      const [blockCommentStart, blockCommentEnd] =
        this.options.blockCommentDelimiters;
      const openDelimiter = delimiterStart + blockCommentStart;
      if (template.slice(start, end).startsWith(openDelimiter)) {
        // find end of block comment
        const closeDelimiter = blockCommentEnd + delimiterEnd;
        end = start + template.slice(start).indexOf(closeDelimiter);
        if (end === -1) {
          break;
        }

        end = end + closeDelimiter.length;

        // write block comment node to AST
        const tag = template.slice(start, end);
        if (tag.startsWith(openDelimiter) && tag.endsWith(closeDelimiter)) {
          const key = tag.slice(openDelimiter.length, -closeDelimiter.length);
          ast.push({ type: "comment", key, tag, start, end });
          current = end;
          continue;
        }
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

  execute(ast: ASTNode[], data: Record<string, unknown> = {}) {
    let result = "";
    let i = 0;
    while (i < ast.length) {
      const node = ast[i];
      if (typeof node === "string") {
        result += node;
      } else if (node.type === "variable") {
        // value must be HTML escaped
        result += formatHTML(getValue(node.key, data));
      } else if (node.type === "raw") {
        // value must be HTML escaped
        result += getValue(node.key, data) ?? "";
      } else if (node.type === "partial") {
        // find a close tag to the partial
        const endIndex = ast.slice(i + 1).findIndex((otherNode) =>
          "string" !== typeof otherNode && otherNode.type === "close" &&
          node.key === otherNode.key && node.depth === otherNode.depth
        );

        // create a new data object with the partial data
        const partialData = setValue(data, node.addition);

        // create an AST from the global AST inside the partial block without the end tag
        const subAst = ast.slice(i + 1, endIndex + i + 1);

        // check if the partial block is defined
        if (this.partials.has(node.key)) {
          const partial = this.partials.get(node.key)!;
          const partialBlock = reservedWord(partial, "$block");
          if (partialBlock !== undefined) {
            // extend the partial AST at the position of the partial block
            partial.splice(partialBlock, 1, ...subAst);
          }
          result += this.execute(partial, partialData);
        } else {
          // create an AST from the global AST inside the partial block without the end tag
          result += this.execute(subAst, partialData);
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

  compile(template: string, options: Partial<KarachoOptions> = {}) {
    if (options.partials) {
      this.registerPartials(options.partials);
    }
    const ast = this.parse(template);
    return (data?: Record<string, unknown>) => {
      const result = this.execute(ast, data);
      return result;
    };
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
    const key = /^(\$?\w[\w\d_.\[\]]+)/.exec(content)?.[1] ?? "";
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
      const keyRE = /^\s*(\w[\w\d\_\/-]+)/;
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
    const [prefix] = this.options.partialDelimiters;
    end = end + endDelimiter.length;

    const tag = template.slice(start, end);
    if (tag.startsWith(startDelimiter) && tag.endsWith(endDelimiter)) {
      const content = tag.slice(startDelimiter.length, -endDelimiter.length);

      // fill key with the first word of the content
      const keyRE = /^\s*(\w[\w\d\_\/-]+)/;
      const key = keyRE.exec(content)?.[1] ?? "";
      const depth = this.#depthMap.get(key) || 0;
      this.#depthMap.set(key, depth + 1);
      const node: ASTPartialNode = {
        type: "partial",
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
      this.#depthMap.set(key, depth + 1);
      return node;
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

  #comment = (
    template: string,
    start: number,
    end: number,
  ): ASTCommentNode | void => {
    const [startDelimiter, endDelimiter] = this.#getDelimiters(
      this.options.commentDelimiters,
    );
    end = end + endDelimiter.length;

    const tag = template.slice(start, end);
    if (tag.startsWith(startDelimiter) && tag.endsWith(endDelimiter)) {
      const key = tag.slice(startDelimiter.length, -endDelimiter.length).trim();
      return { type: "comment", key, tag, start, end };
    }
  };
}
