export interface LexerOptions {
  escape: string;

  delimiterStart: string;
  delimiterEnd: string;

  rawPrefix: string;
  rawSuffix: string;

  helperPrefix: string;
  helperSuffix: string;

  partialPrefix: string;
  partialSuffix: string;

  closePrefix: string;
  closeSuffix: string;
}

export type ASTTextNode = string;

export interface ASTRawNode {
  type: "raw";
  tag: string;
  key: string;
  start: number;
  end: number;
}

export interface ASTVariableNode {
  type: "variable";
  tag: string;
  key: string;
  start: number;
  end: number;
  addition?: string;
}

export interface ASTPartialNode {
  type: "partial";
  tag: string;
  key: string;
  depth: number;
  start: number;
  end: number;
}

export interface ASTHelperNode {
  type: "helper";
  tag: string;
  key: string;
  depth: number;
  start: number;
  end: number;
  addition?: string;
}

export interface ASTCloseNode {
  type: "close";
  tag: string;
  key: string;
  depth: number;
  start: number;
  end: number;
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
) => ASTObjectNode;

export class Lexer {
  options: LexerOptions;

  readonly #handlers = new Set<ASTTagHandler>();
  readonly #depthMap = new Map<string, number>();

  constructor(options: Partial<LexerOptions> = {}) {
    this.options = {
      escape: "\\",

      delimiterStart: "{{",
      delimiterEnd: "}}",

      rawPrefix: "{",
      rawSuffix: "}",

      helperPrefix: "#",
      helperSuffix: "",

      partialPrefix: ">",
      partialSuffix: "",

      closePrefix: "/",
      closeSuffix: "",

      ...options,
    };

    this.#handlers.add(this.#raw);
    this.#handlers.add(this.#helpers);
    this.#handlers.add(this.#partials);
    this.#handlers.add(this.#close);
    this.#handlers.add(this.#variable);
  }

  tokenize(template: string) {
    const ast: ASTNode[] = [];
    const { delimiterStart, delimiterEnd } = this.options;

    let current = 0;
    while (current < template.length) {
      // find start and end of tag
      let start = template.indexOf(delimiterStart, current);
      let end = template.indexOf(delimiterEnd, start);
      if (start === -1 || end === -1) {
        break;
      }

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
      for (const handleTag of this.#handlers) {
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

  #raw = (template: string, start: number, end: number): ASTRawNode => {
    const { delimiterStart, delimiterEnd, rawPrefix, rawSuffix } = this.options;

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
    const { delimiterStart, delimiterEnd } = this.options;
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

  #helpers = (template: string, start: number, end: number): ASTHelperNode => {
    const { delimiterStart, delimiterEnd, helperPrefix, helperSuffix } =
      this.options;
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
  ): ASTPartialNode => {
    const { delimiterStart, delimiterEnd, partialPrefix, partialSuffix } =
      this.options;
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

  #close = (template: string, start: number, end: number): ASTCloseNode => {
    const { delimiterStart, delimiterEnd, closePrefix, closeSuffix } =
      this.options;
    end = end + closeSuffix.length + delimiterEnd.length;
    const tag = template.slice(
      start,
      end,
    );
    const startDelimiter = delimiterStart + closePrefix;
    const endDelimiter = closeSuffix + delimiterEnd;
    if (tag.startsWith(startDelimiter) && tag.endsWith(endDelimiter)) {
      const key = tag.slice(startDelimiter.length, -endDelimiter.length);
      const depth = this.#depthMap.get(key) - 1 || 0;
      if (depth < 0) {
        this.#depthMap.delete(key);
      } else {
        this.#depthMap.set(key, depth);
      }

      return { type: "close", key, tag, depth, start, end };
    }
  };
}
