import { Interpreter, InterpreterOptions } from "./src/Interpreter.ts";
import { ASTNode, Lexer, LexerOptions } from "./src/Lexer.ts";

let lexer!: Lexer;
let interpreter!: Interpreter;

export function tokenize(
  template: string,
  options: Partial<LexerOptions> = {},
) {
  if (!lexer) {
    lexer = new Lexer(options);
  }
  return lexer.tokenize(template);
}

export function compile(
  template: string,
  options: Partial<InterpreterOptions> = {},
) {
  if (!interpreter) {
    interpreter = new Interpreter(options);
  }
  return interpreter.compile(template);
}

export function execute(
  ast: ASTNode[],
  data: Record<string, unknown>,
  options: Partial<InterpreterOptions> = {},
) {
  if (!interpreter) {
    interpreter = new Interpreter(options);
  }
  return interpreter.executeAST(ast, data);
}
