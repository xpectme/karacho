import { Interpreter, InterpreterOptions } from "./src/Interpreter.ts";
import { ASTNode } from "./src/Lexer.ts";

export * from "./src/Interpreter.ts";
export * from "./src/Lexer.ts";
export * from "./src/BuiltInHelpers.ts";

let interpreter!: Interpreter;
function getInstance(options: Partial<InterpreterOptions> = {}) {
  if (!interpreter) {
    interpreter = new Interpreter(options);
  }
  return interpreter;
}

export function tokenize(
  template: string,
  options: Partial<InterpreterOptions> = {},
) {
  return getInstance(options).lexer.tokenize(template);
}

export function compile(
  template: string,
  partials?: Record<string, string>,
  options: Partial<InterpreterOptions> = {},
) {
  const instance = getInstance(options);
  if (partials) {
    instance.registerPartials(partials);
  }
  return getInstance(options).compile(template);
}

export function execute(
  ast: ASTNode[],
  data: Record<string, unknown>,
  partials?: Record<string, string>,
  options: Partial<InterpreterOptions> = {},
) {
  return getInstance(options).executeAST(ast, data, partials);
}
