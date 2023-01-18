import { assertEquals } from "https://deno.land/std@0.152.0/testing/asserts.ts";
import { Bart } from "./Bart.ts";

Deno.test("create AST", () => {
  const bart = new Bart();
  const ast = bart.parse(
    "Hello {{name}}! You have {{count}} new messages.",
  );
  assertEquals(ast, [
    "Hello ",
    { type: "variable", key: "name", tag: "{{name}}", start: 6, end: 14 },
    "! You have ",
    { type: "variable", key: "count", tag: "{{count}}", start: 25, end: 34 },
    " new messages.",
  ]);
});

Deno.test("create AST with variable with object", () => {
  const bart = new Bart();
  const ast = bart.parse(
    "Hello {{name.first}}! You have {{count}} new messages.",
  );
  assertEquals(ast, [
    "Hello ",
    {
      type: "variable",
      key: "name.first",
      tag: "{{name.first}}",
      start: 6,
      end: 20,
    },
    "! You have ",
    { type: "variable", key: "count", tag: "{{count}}", start: 31, end: 40 },
    " new messages.",
  ]);
});

Deno.test("create AST with raw variable", () => {
  const bart = new Bart();
  const ast = bart.parse(
    "Hello {{{name}}}! You have {{{count}}} new messages.",
  );
  assertEquals(ast, [
    "Hello ",
    { type: "raw", key: "name", tag: "{{{name}}}", start: 6, end: 16 },
    "! You have ",
    { type: "raw", key: "count", tag: "{{{count}}}", start: 27, end: 38 },
    " new messages.",
  ]);
});

Deno.test("create AST with partial", () => {
  const bart = new Bart();
  const ast = bart.parse(
    "Hello {{>name}}! You have {{>count}} new messages.",
  );
  assertEquals(ast, [
    "Hello ",
    {
      type: "partial",
      key: "name",
      tag: "{{>name}}",
      depth: 0,
      start: 6,
      end: 15,
    },
    "! You have ",
    {
      type: "partial",
      key: "count",
      tag: "{{>count}}",
      depth: 0,
      start: 26,
      end: 36,
    },
    " new messages.",
  ]);
});

Deno.test("create AST with helper", () => {
  const bart = new Bart();
  const ast = bart.parse(
    "Hello {{#name}}! You have {{#count}} new messages.",
  );
  assertEquals(ast, [
    "Hello ",
    {
      type: "helper",
      key: "name",
      tag: "{{#name}}",
      depth: 0,
      start: 6,
      end: 15,
    },
    "! You have ",
    {
      type: "helper",
      key: "count",
      tag: "{{#count}}",
      depth: 0,
      start: 26,
      end: 36,
    },
    " new messages.",
  ]);
});

Deno.test("create AST with partial and close tag", () => {
  const bart = new Bart();
  const ast = bart.parse(
    "Hello {{>name}}! You have {{/name}} new messages.",
  );
  assertEquals(ast, [
    "Hello ",
    {
      type: "partial",
      key: "name",
      tag: "{{>name}}",
      depth: 0,
      start: 6,
      end: 15,
    },
    "! You have ",
    {
      type: "close",
      key: "name",
      tag: "{{/name}}",
      depth: 0,
      start: 26,
      end: 35,
    },
    " new messages.",
  ]);
});

Deno.test("create AST with helper and close tag", () => {
  const bart = new Bart();
  const ast = bart.parse(
    "Hello {{#name}}! You have {{/name}} new messages.",
  );
  assertEquals(ast, [
    "Hello ",
    {
      type: "helper",
      key: "name",
      tag: "{{#name}}",
      depth: 0,
      start: 6,
      end: 15,
    },
    "! You have ",
    {
      type: "close",
      key: "name",
      tag: "{{/name}}",
      depth: 0,
      start: 26,
      end: 35,
    },
    " new messages.",
  ]);
});

Deno.test("create AST with nested helper", () => {
  const bart = new Bart();
  const ast = bart.parse(
    "Hello {{#wrapper}}! You have {{#count}} new messages{{/wrapper}}.",
  );
  assertEquals(ast, [
    "Hello ",
    {
      type: "helper",
      key: "wrapper",
      tag: "{{#wrapper}}",
      depth: 0,
      start: 6,
      end: 18,
    },
    "! You have ",
    {
      type: "helper",
      key: "count",
      tag: "{{#count}}",
      depth: 0,
      start: 29,
      end: 39,
    },
    " new messages",
    {
      type: "close",
      key: "wrapper",
      tag: "{{/wrapper}}",
      depth: 0,
      start: 52,
      end: 64,
    },
    ".",
  ]);
});

Deno.test("create AST with identical nested helper", () => {
  const bart = new Bart();
  const ast = bart.parse(
    "Hello {{#wrapper}}! You have {{#wrapper}}new{{/wrapper}} messages{{/wrapper}}.",
  );
  assertEquals(ast, [
    "Hello ",
    {
      type: "helper",
      key: "wrapper",
      tag: "{{#wrapper}}",
      depth: 0,
      start: 6,
      end: 18,
    },
    "! You have ",
    {
      type: "helper",
      key: "wrapper",
      tag: "{{#wrapper}}",
      depth: 1,
      start: 29,
      end: 41,
    },
    "new",
    {
      type: "close",
      key: "wrapper",
      tag: "{{/wrapper}}",
      depth: 1,
      start: 44,
      end: 56,
    },
    " messages",
    {
      type: "close",
      key: "wrapper",
      tag: "{{/wrapper}}",
      depth: 0,
      start: 65,
      end: 77,
    },
    ".",
  ]);
});

Deno.test("create AST with nested helper", () => {
  const bart = new Bart();
  const ast = bart.parse(
    "{{#wrapper}}{{#wrapper}}inner{{/wrapper}}outer{{/wrapper}}",
  );
  assertEquals(ast, [
    {
      type: "helper",
      key: "wrapper",
      tag: "{{#wrapper}}",
      depth: 0,
      start: 0,
      end: 12,
    },
    {
      type: "helper",
      key: "wrapper",
      tag: "{{#wrapper}}",
      depth: 1,
      start: 12,
      end: 24,
    },
    "inner",
    {
      type: "close",
      key: "wrapper",
      tag: "{{/wrapper}}",
      depth: 1,
      start: 29,
      end: 41,
    },
    "outer",
    {
      type: "close",
      key: "wrapper",
      tag: "{{/wrapper}}",
      depth: 0,
      start: 46,
      end: 58,
    },
  ]);
});

Deno.test("create AST with nested partial", () => {
  const bart = new Bart();
  const ast = bart.parse(
    "{{>wrapper}}{{>wrapper}}inner{{/wrapper}}outer{{/wrapper}}",
  );
  assertEquals(ast, [
    {
      type: "partial",
      key: "wrapper",
      tag: "{{>wrapper}}",
      depth: 0,
      start: 0,
      end: 12,
    },
    {
      type: "partial",
      key: "wrapper",
      tag: "{{>wrapper}}",
      depth: 1,
      start: 12,
      end: 24,
    },
    "inner",
    {
      type: "close",
      key: "wrapper",
      tag: "{{/wrapper}}",
      depth: 1,
      start: 29,
      end: 41,
    },
    "outer",
    {
      type: "close",
      key: "wrapper",
      tag: "{{/wrapper}}",
      depth: 0,
      start: 46,
      end: 58,
    },
  ]);
});

Deno.test("create AST with variable and pipe operations", () => {
  const bart = new Bart();
  const ast = bart.parse(
    "Hello {{name uppercase | lowercase | capitalize}}! You have {{count}} new messages.",
  );
  assertEquals(ast, [
    "Hello ",
    {
      type: "variable",
      key: "name",
      tag: "{{name uppercase | lowercase | capitalize}}",
      start: 6,
      end: 49,
      addition: "uppercase | lowercase | capitalize",
    },
    "! You have ",
    {
      type: "variable",
      key: "count",
      tag: "{{count}}",
      start: 60,
      end: 69,
    },
    " new messages.",
  ]);
});

Deno.test("create AST with helper and additional arguments", () => {
  const bart = new Bart();
  const ast = bart.parse(
    "Hello {{#name uppercase | lowercase | capitalize}}! You have {{count}} new messages.",
  );
  assertEquals(ast, [
    "Hello ",
    {
      type: "helper",
      key: "name",
      tag: "{{#name uppercase | lowercase | capitalize}}",
      depth: 0,
      start: 6,
      end: 50,
      addition: "uppercase | lowercase | capitalize",
    },
    "! You have ",
    {
      type: "variable",
      key: "count",
      tag: "{{count}}",
      start: 61,
      end: 70,
    },
    " new messages.",
  ]);
});

Deno.test("create AST with helper and additional arguments and close tag", () => {
  const bart = new Bart();
  const ast = bart.parse(
    "Hello {{#name uppercase | lowercase | capitalize}}! You have {{/name}} new messages.",
  );
  assertEquals(ast, [
    "Hello ",
    {
      type: "helper",
      key: "name",
      tag: "{{#name uppercase | lowercase | capitalize}}",
      depth: 0,
      start: 6,
      end: 50,
      addition: "uppercase | lowercase | capitalize",
    },
    "! You have ",
    {
      type: "close",
      key: "name",
      tag: "{{/name}}",
      depth: 0,
      start: 61,
      end: 70,
    },
    " new messages.",
  ]);
});

// Deno.test("create AST with escaped variable", () => {
//   const bart = new Interpreter();
//   const ast = bart.parse(
//     "Hello \\{{name}}! You have {{count}} new messages.",
//   );
//   assertEquals(ast, [
//     "Hello {{name}}! You have ",
//     {
//       type: "variable",
//       key: "count",
//       tag: "{{count}}",
//       start: 26,
//       end: 35,
//     },
//     " new messages.",
//   ]);
// });