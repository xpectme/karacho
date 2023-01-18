import { assertEquals } from "https://deno.land/std@0.152.0/testing/asserts.ts";
import * as builtin from "./BuiltInHelpers.ts";
import { Interpreter } from "./Interpreter.ts";

Deno.test("execute ifHelper", () => {
  const interpreter = new Interpreter();
  interpreter.helpers.set("if", builtin.ifHelper);

  const template = interpreter.compile(
    "{{#if name}}Hello {{name}}{{/if}}",
  );

  const result = template({ name: "World" });
  assertEquals(result, "Hello World");

  const result2 = template({ name: "" });
  assertEquals(result2, "");
});

Deno.test("execute ifHelper with and", () => {
  const interpreter = new Interpreter();
  interpreter.helpers.set("if", builtin.ifHelper);

  const template = interpreter.compile(
    "{{#if name and age}}Hello {{name}}{{/if}}",
  );

  const result = template({ name: "World", age: 20 });
  assertEquals(result, "Hello World");

  const result2 = template({ name: "World", age: 0 });
  assertEquals(result2, "");
});

Deno.test("execute ifHelper with or", () => {
  const interpreter = new Interpreter();
  interpreter.helpers.set("if", builtin.ifHelper);

  const template = interpreter.compile(
    "{{#if name or age}}Hello {{name}}{{/if}}",
  );

  const result = template({ name: "World", age: 0 });
  assertEquals(result, "Hello World");

  const result2 = template({ name: "", age: 0 });
  assertEquals(result2, "");
});

Deno.test("execute ifHelper with not", () => {
  const interpreter = new Interpreter();
  interpreter.helpers.set("if", builtin.ifHelper);

  const template = interpreter.compile(
    "{{#if not name}}Hello {{name}}{{/if}}",
  );

  const result = template({ name: "" });
  assertEquals(result, "Hello ");

  const result2 = template({ name: "World" });
  assertEquals(result2, "");
});

Deno.test("execute ifHelper with else", () => {
  const interpreter = new Interpreter();
  interpreter.helpers.set("if", builtin.ifHelper);

  const template = interpreter.compile(
    "{{#if name}}Hello {{name}}{{else}}Hello stranger{{/if}}",
  );

  const result = template({ name: "World" });
  assertEquals(result, "Hello World");

  const result2 = template({ name: "" });
  assertEquals(result2, "Hello stranger");
});

Deno.test("execute eachHelper", () => {
  const interpreter = new Interpreter();
  interpreter.helpers.set("each", builtin.eachHelper);

  const template = interpreter.compile(
    "{{#each items as item}}{{item}}{{/each}}",
  );

  const result = template({ items: ["a", "b", "c"] });
  assertEquals(result, "abc");

  const result2 = template({ items: [] });
  assertEquals(result2, "");
});

Deno.test("execute eachHelper with index", () => {
  const interpreter = new Interpreter();
  interpreter.helpers.set("each", builtin.eachHelper);

  const template = interpreter.compile(
    "{{#each items as item, index}}{{index}}{{/each}}",
  );

  const result = template({ items: ["a", "b", "c"] });
  assertEquals(result, "012");

  const result2 = template({ items: [] });
  assertEquals(result2, "");
});

Deno.test("execute setHelper", () => {
  const interpreter = new Interpreter();
  interpreter.helpers.set("set", builtin.setHelper);

  const template = interpreter.compile("{{#set name = World}}Hello {{name}}");

  const result = template({});
  assertEquals(result, "Hello World");
});

Deno.test("execute withHelper with context", () => {
  const interpreter = new Interpreter();
  interpreter.helpers.set("with", builtin.withHelper);

  const template = interpreter.compile(
    "{{#with person}}Hello {{firstname}} {{lastname}}{{/with}}",
  );

  const result = template({
    person: {
      firstname: "John",
      lastname: "Doe",
    },
  });
  assertEquals(result, "Hello John Doe");
});
