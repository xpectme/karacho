export interface LexerOptions {
  escape: string;

  delimiters: [string, string];
  rawDelimiters: [string, string];
  helperDelimiters: [string, string];
  partialDelimiters: [string, string];
  closeDelimiters: [string, string];
}

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

export interface ASTCustomNode<Type extends string = string>
  extends ASTNodeBase {
  type: Type;
}

export type ASTCustomObjectNode<Type extends string = string> =
  | ASTCustomNode<Type>
  | ASTCustomNode<Type> & (ASTNodeAddition | ASTNodeBlockDepth);

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

export class Lexer {
  options: LexerOptions;

  readonly #tags = new Set<ASTTagHandler>();
  readonly #depthMap = new Map<string, number>();

  constructor(options: Partial<LexerOptions> = {}) {
    this.options = {
      escape: "\\",

      delimiters: ["{{", "}}"],
      rawDelimiters: ["{", "}"],
      helperDelimiters: ["#", ""],
      partialDelimiters: [">", ""],
      closeDelimiters: ["/", ""],

      ...options,
    };

    // TODO: allow custom tags
    this.#tags.add(this.#raw);
    this.#tags.add(this.#helpers);
    this.#tags.add(this.#partials);
    this.#tags.add(this.#close);
    this.#tags.add(this.#variable);
  }

  tokenize(template: string) {
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
      for (const handleTag of this.#tags) {
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

  #raw = (template: string, start: number, end: number): ASTRawNode | void => {
    const [delimiterStart, delimiterEnd] = this.options.delimiters;
    const [rawPrefix, rawSuffix] = this.options.rawDelimiters;

    end = end + rawSuffix.length + delimiterEnd.length;
    const tag = template.slice(start, end);
    const startDelimiter = delimiterStart + rawPrefix;
    const endDelimiter = rawSuffix + delimiterEnd;
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
    const [delimiterStart, delimiterEnd] = this.options.delimiters;
    end = end + delimiterEnd.length;
    const tag = template.slice(start, end);
    const content = tag.slice(delimiterStart.length, -delimiterEnd.length);

    // fill key with the first word of the content
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
    const [delimiterStart, delimiterEnd] = this.options.delimiters;
    const [helperPrefix, helperSuffix] = this.options.helperDelimiters;
    end = end + helperSuffix.length + delimiterEnd.length;
    const tag = template.slice(start, end);
    const startDelimiter = delimiterStart + helperPrefix;
    const endDelimiter = helperSuffix + delimiterEnd;
    if (tag.startsWith(startDelimiter) && tag.endsWith(endDelimiter)) {
      const content = tag.slice(delimiterStart.length, -delimiterEnd.length);

      // fill key with the first word of the content
      const keyRE = new RegExp(`^${helperPrefix}(\\w[\\w\\d\\-_]+)`);
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
      const addition = content.slice(key.length + helperPrefix.length).trim();
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
    const [delimiterStart, delimiterEnd] = this.options.delimiters;
    const [partialPrefix, partialSuffix] = this.options.partialDelimiters;
    end = end + partialSuffix.length + delimiterEnd.length;
    const tag = template.slice(start, end);
    const startDelimiter = delimiterStart + partialPrefix;
    const endDelimiter = partialSuffix + delimiterEnd;
    if (tag.startsWith(startDelimiter) && tag.endsWith(endDelimiter)) {
      const key = tag.slice(startDelimiter.length, -endDelimiter.length);
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
    const [delimiterStart, delimiterEnd] = this.options.delimiters;
    const [closePrefix, closeSuffix] = this.options.closeDelimiters;
    end = end + closeSuffix.length + delimiterEnd.length;
    const tag = template.slice(
      start,
      end,
    );
    const startDelimiter = delimiterStart + closePrefix;
    const endDelimiter = closeSuffix + delimiterEnd;
    if (tag.startsWith(startDelimiter) && tag.endsWith(endDelimiter)) {
      const key = tag.slice(startDelimiter.length, -endDelimiter.length);

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
}
