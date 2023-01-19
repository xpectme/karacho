import { assertEquals } from "https://deno.land/std@0.152.0/testing/asserts.ts";
import { Bart } from "./Bart.ts";

Deno.test("execute ifHelper", () => {
  const interpreter = new Bart();
  const template = interpreter.compile(
    "{{#if name}}Hello {{name}}{{/if}}",
  );

  const result = template({ name: "World" });
  assertEquals(result, "Hello World");

  const result2 = template({ name: "" });
  assertEquals(result2, "");
});

Deno.test("execute ifHelper with and", () => {
  const interpreter = new Bart();
  const template = interpreter.compile(
    "{{#if name and age}}Hello {{name}}{{/if}}",
  );

  const result = template({ name: "World", age: 20 });
  assertEquals(result, "Hello World");

  const result2 = template({ name: "World", age: 0 });
  assertEquals(result2, "");
});

Deno.test("execute ifHelper with or", () => {
  const interpreter = new Bart();
  const template = interpreter.compile(
    "{{#if name or age}}Hello {{name}}{{/if}}",
  );

  const result = template({ name: "World", age: 0 });
  assertEquals(result, "Hello World");

  const result2 = template({ name: "", age: 0 });
  assertEquals(result2, "");
});

Deno.test("execute ifHelper with not", () => {
  const interpreter = new Bart();
  const template = interpreter.compile(
    "{{#if not name}}Hello {{name}}{{/if}}",
  );

  const result = template({ name: "" });
  assertEquals(result, "Hello ");

  const result2 = template({ name: "World" });
  assertEquals(result2, "");
});

Deno.test("execute ifHelper with else", () => {
  const interpreter = new Bart();
  const template = interpreter.compile(
    "{{#if name}}Hello {{name}}{{else}}Hello stranger{{/if}}",
  );

  const result = template({ name: "World" });
  assertEquals(result, "Hello World");

  const result2 = template({ name: "" });
  assertEquals(result2, "Hello stranger");
});

Deno.test("execute ifHelper with equals operator", () => {
  const interpreter = new Bart();
  const template = interpreter.compile(
    "{{#if name == 'World'}}Hello {{name}}{{else}}I don't talk to strangers!{{/if}}",
  );

  const result = template({ name: "World" });
  assertEquals(result, "Hello World");

  const result2 = template({ name: "Stranger" });
  assertEquals(result2, "I don't talk to strangers!");
});

Deno.test("execute ifHelper with not equals operator", () => {
  const interpreter = new Bart();
  const template = interpreter.compile(
    "{{#if name != 'World'}}Hello {{name}}{{else}}I don't talk to strangers!{{/if}}",
  );

  const result = template({ name: "Stranger" });
  assertEquals(result, "Hello Stranger");

  const result2 = template({ name: "World" });
  assertEquals(result2, "I don't talk to strangers!");
});

Deno.test("execute ifHelper with equals and additional comparison", () => {
  const interpreter = new Bart();
  const template = interpreter.compile(
    "{{#if name == 'World' and age > 18}}Hello {{name}}{{else}}I don't talk to strangers!{{/if}}",
  );

  const result = template({ name: "World", age: 20 });
  assertEquals(result, "Hello World");

  const result2 = template({ name: "World", age: 16 });
  assertEquals(result2, "I don't talk to strangers!");
});

Deno.test("execute eachHelper", () => {
  const interpreter = new Bart();
  const template = interpreter.compile(
    "{{#each items as item}}{{item}}{{/each}}",
  );

  const result = template({ items: ["a", "b", "c"] });
  assertEquals(result, "abc");

  const result2 = template({ items: [] });
  assertEquals(result2, "");
});

Deno.test("execute eachHelper with index", () => {
  const interpreter = new Bart();
  const template = interpreter.compile(
    "{{#each items as item, index}}{{index}}{{/each}}",
  );

  const result = template({ items: ["a", "b", "c"] });
  assertEquals(result, "012");

  const result2 = template({ items: [] });
  assertEquals(result2, "");
});

Deno.test("execute eachHelper with key", () => {
  const interpreter = new Bart();
  const template = interpreter.compile(
    "{{#each items as item, key}}{{key}}{{/each}}",
  );

  const result = template({ items: { a: "a", b: "b", c: "c" } });
  assertEquals(result, "abc");
});

Deno.test("execute eachHelper with index and key", () => {
  const interpreter = new Bart();
  const template = interpreter.compile(
    "{{#each items as value, key}}{{key}}{{value}}{{/each}}",
  );

  const result = template({ items: { a: 1, b: 2, c: 3 } });
  assertEquals(result, "a1b2c3");
});

Deno.test("execute eachHelper with index and key", () => {
  const interpreter = new Bart();
  const template = interpreter.compile(
    "{{#each items as value, key, index}}{{key}}{{index}}{{/each}}",
  );

  const result = template({ items: { a: 1, b: 2, c: 3 } });
  assertEquals(result, "a0b1c2");
});

Deno.test("execute eachHelper with else case", () => {
  const interpreter = new Bart();
  const template = interpreter.compile(
    "{{#each items as item}}{{item}}{{else}}No items{{/each}}",
  );

  const result = template({ items: ["a", "b", "c"] });
  assertEquals(result, "abc");

  const result2 = template({ items: [] });
  assertEquals(result2, "No items");
});

Deno.test("execute setHelper", () => {
  const interpreter = new Bart();
  const template = interpreter.compile("{{#set name = World}}Hello {{name}}");

  const result = template({});
  assertEquals(result, "Hello World");
});

Deno.test("execute withHelper with context", () => {
  const interpreter = new Bart();
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
