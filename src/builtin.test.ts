import { assertEquals } from "https://deno.land/std@0.177.0/testing/asserts.ts";
import { eachHelper } from "./BuiltInHelpers.ts";
import { ASTHelperNode, ASTVariableNode, Karacho } from "./Karacho.ts";

Deno.test("execute ifHelper", () => {
  const interpreter = new Karacho();
  const template = interpreter.compile(
    "{{#if name}}Hello {{name}}{{/if}}",
  );

  const result = template({ name: "World" });
  assertEquals(result, "Hello World");

  const result2 = template({ name: "" });
  assertEquals(result2, "");
});

Deno.test("execute ifHelper with and", () => {
  const interpreter = new Karacho();
  const template = interpreter.compile(
    "{{#if name and age}}Hello {{name}}{{/if}}",
  );

  const result = template({ name: "World", age: 20 });
  assertEquals(result, "Hello World");

  const result2 = template({ name: "World", age: 0 });
  assertEquals(result2, "");
});

Deno.test("execute ifHelper with or", () => {
  const interpreter = new Karacho();
  const template = interpreter.compile(
    "{{#if name or age}}Hello {{name}}{{/if}}",
  );

  const result = template({ name: "World", age: 0 });
  assertEquals(result, "Hello World");

  const result2 = template({ name: "", age: 0 });
  assertEquals(result2, "");
});

Deno.test("execute ifHelper with not", () => {
  const interpreter = new Karacho();
  const template = interpreter.compile(
    "{{#if not name}}Hello {{name}}{{/if}}",
  );

  const result = template({ name: "" });
  assertEquals(result, "Hello ");

  const result2 = template({ name: "World" });
  assertEquals(result2, "");
});

Deno.test("execute ifHelper with else", () => {
  const interpreter = new Karacho();
  const template = interpreter.compile(
    "{{#if name}}Hello {{name}}{{else}}Hello stranger{{/if}}",
  );

  const result = template({ name: "World" });
  assertEquals(result, "Hello World");

  const result2 = template({ name: "" });
  assertEquals(result2, "Hello stranger");
});

Deno.test("execute ifHelper with equals operator", () => {
  const interpreter = new Karacho();
  const template = interpreter.compile(
    "{{#if name == 'World'}}Hello {{name}}{{else}}I don't talk to strangers!{{/if}}",
  );

  const result = template({ name: "World" });
  assertEquals(result, "Hello World");

  const result2 = template({ name: "Stranger" });
  assertEquals(result2, "I don't talk to strangers!");
});

Deno.test("execute ifHelper with not equals operator", () => {
  const interpreter = new Karacho();
  const template = interpreter.compile(
    "{{#if name != 'World'}}Hello {{name}}{{else}}I don't talk to strangers!{{/if}}",
  );

  const result = template({ name: "Stranger" });
  assertEquals(result, "Hello Stranger");

  const result2 = template({ name: "World" });
  assertEquals(result2, "I don't talk to strangers!");
});

Deno.test("execute ifHelper with equals and additional comparison", () => {
  const interpreter = new Karacho();
  const template = interpreter.compile(
    "{{#if name == 'World' and age > 18}}Hello {{name}}{{else}}I don't talk to strangers!{{/if}}",
  );

  const result = template({ name: "World", age: 20 });
  assertEquals(result, "Hello World");

  const result2 = template({ name: "World", age: 16 });
  assertEquals(result2, "I don't talk to strangers!");
});

Deno.test("execute ifHelper with object property check", () => {
  const interpreter = new Karacho();
  const template = interpreter.compile(
    "{{#if person.name}}Hello {{person.name}}{{else}}I don't talk to strangers!{{/if}}",
  );

  const result = template({ person: { name: "World" } });
  assertEquals(result, "Hello World");

  const result2 = template({ person: { name: "" } });
  assertEquals(result2, "I don't talk to strangers!");
});

Deno.test("execute ifHelper block with newlines", () => {
  const interpreter = new Karacho();
  const template = interpreter.compile(
    "{{#if name}}\nHello {{name}}\n{{else}}\nHello stranger\n{{/if}}",
  );

  const result = template({ name: "World" });

  assertEquals(result, "\nHello World\n");

  const result2 = template({ name: "" });
  assertEquals(result2, "\nHello stranger\n");
});

Deno.test("execute ifHelper block with navbar", () => {
  const interpreter = new Karacho();
  const template = interpreter.compile(
    `{{#if item.path == selectedPath}}
    <a href="{{item.path}}">{{item.title}}</a>
    {{else}}
    <b>{{item.title}}</b>
    {{/if}}`,
  );

  const result = template({
    item: { path: "/home", title: "Home" },
    selectedPath: "/home",
  });
  assertEquals(
    result.trim(),
    `<a href="/home">Home</a>`,
  );

  const result2 = template({
    item: { path: "/home", title: "Home" },
    selectedPath: "/about",
  });
  assertEquals(
    result2.trim(),
    `<b>Home</b>`,
  );
});

const createVarNode = (key: string): ASTVariableNode => ({
  type: "variable",
  end: 0,
  start: 0,
  key,
  tag: `{{${key}}}`,
});
const createHelperNode = (rawArgs: string): ASTHelperNode => ({
  type: "helper",
  end: 0,
  start: 0,
  key: "each",
  tag: `{{#each ${rawArgs}}}`,
  addition: rawArgs,
  depth: 0,
});

Deno.test("execute {{#each value, key, index in items}}", () => {
  const interpreter = new Karacho();
  const result = eachHelper.call(
    interpreter,
    { items: ["a", "b", "c"] },
    createHelperNode("value, key, index in items"),
    [
      createVarNode("value"),
      createVarNode("key"),
      createVarNode("index"),
    ],
  );

  assertEquals(result, "a00b11c22");
});

Deno.test("execute {{#each value, key in items}}", () => {
  const interpreter = new Karacho();
  const result = eachHelper.call(
    interpreter,
    { items: ["a", "b", "c"] },
    createHelperNode("value, key in items"),
    [
      createVarNode("value"),
      createVarNode("key"),
      createVarNode("$index"),
    ],
  );

  assertEquals(result, "a00b11c22");
});

Deno.test("execute {{#each value in items}}", () => {
  const interpreter = new Karacho();
  const result = eachHelper.call(
    interpreter,
    { items: ["a", "b", "c"] },
    createHelperNode("value in items"),
    [
      createVarNode("value"),
      createVarNode("$key"),
      createVarNode("$index"),
    ],
  );

  assertEquals(result, "a00b11c22");
});

Deno.test("execute {{#each items}}", () => {
  const interpreter = new Karacho();
  const result = eachHelper.call(
    interpreter,
    { items: ["a", "b", "c"] },
    createHelperNode("items"),
    [
      createVarNode("$this"),
      createVarNode("$key"),
      createVarNode("$index"),
    ],
  );

  assertEquals(result, "a00b11c22");
});

Deno.test("execute eachHelper", () => {
  const interpreter = new Karacho();
  const template = interpreter.compile(
    "{{#each item in items}}{{item}}{{/each}}",
  );

  const result = template({ items: ["a", "b", "c"] });
  assertEquals(result, "abc");

  const result2 = template({ items: [] });
  assertEquals(result2, "");
});

Deno.test("execute eachHelper with index", () => {
  const interpreter = new Karacho();
  const template = interpreter.compile(
    "{{#each item, index in items}}{{index}}{{/each}}",
  );

  const result = template({ items: ["a", "b", "c"] });
  assertEquals(result, "012");

  const result2 = template({ items: [] });
  assertEquals(result2, "");
});

Deno.test("execute eachHelper with key", () => {
  const interpreter = new Karacho();
  const template = interpreter.compile(
    "{{#each item, key in items}}{{key}}{{/each}}",
  );

  const result = template({ items: { a: "a", b: "b", c: "c" } });
  assertEquals(result, "abc");
});

Deno.test("execute eachHelper with index and key", () => {
  const interpreter = new Karacho();
  const template = interpreter.compile(
    "{{#each value, key in items}}{{key}}{{value}}{{/each}}",
  );

  const result = template({ items: { a: 1, b: 2, c: 3 } });
  assertEquals(result, "a1b2c3");
});

Deno.test("execute eachHelper with index and key", () => {
  const interpreter = new Karacho();
  const template = interpreter.compile(
    "{{#each value, key, index in items}}{{key}}{{index}}{{/each}}",
  );

  const result = template({ items: { a: 1, b: 2, c: 3 } });
  assertEquals(result, "a0b1c2");
});

Deno.test("execute eachHelper with else case", () => {
  const interpreter = new Karacho();
  const template = interpreter.compile(
    "{{#each item in items}}{{item}}{{else}}No items{{/each}}",
  );

  const result = template({ items: ["a", "b", "c"] });
  assertEquals(result, "abc");

  const result2 = template({ items: [] });
  assertEquals(result2, "No items");
});

Deno.test("execute setHelper", () => {
  const interpreter = new Karacho();
  const template = interpreter.compile("{{#set name = 'World'}}Hello {{name}}");

  const result = template();
  assertEquals(result, "Hello World");
});

Deno.test("execute withHelper with context", () => {
  const interpreter = new Karacho();
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

Deno.test("create navbar with loopHelper and ifHelper", () => {
  const interpreter = new Karacho();
  const template = interpreter.compile(
    `{{#each item in items}}{{#if item.path == selectedPath}}<b>{{item.title}}</b>{{else}}<a href="{{item.path}}">{{item.title}}</a>{{/if}}{{/each}}`,
  );

  const result = template({
    items: [
      { path: "/home", title: "Home" },
      { path: "/about", title: "About" },
    ],
    selectedPath: "/home",
  })?.trim();
  assertEquals(
    result,
    `<b>Home</b><a href="/about">About</a>`,
  );
});

Deno.test("create a default helper and set a variable", () => {
  const interpreter = new Karacho();
  const template = interpreter.compile(
    "{{#default name = 'World'}}Hello {{name}}",
  );

  const result = template({});
  assertEquals(result, "Hello World");
});

Deno.test("create a default helper that handles an existing variable", () => {
  const interpreter = new Karacho();
  const template = interpreter.compile(
    "{{#default name = 'World'}}Hello {{name}}",
  );

  const result = template({ name: "Deno" });
  assertEquals(result, "Hello Deno");
});

Deno.test("create a default helper that handles non-existing multiple variables", () => {
  const interpreter = new Karacho();
  const template = interpreter.compile(
    "{{#default name = 'Bruce Wayne', age = 35}}{{name}} is {{age}} years old",
  );

  const result = template();
  assertEquals(result, "Bruce Wayne is 35 years old");
});

Deno.test("create a default helper that handles multiple variables", () => {
  const interpreter = new Karacho();
  const template = interpreter.compile(
    "{{#default name = 'Bruce Wayne', age = 35}}{{name}} is {{age}} years old",
  );

  const result = template({ name: "Jim Gordon", age: 77 });
  assertEquals(result, "Jim Gordon is 77 years old");
});

Deno.test("create default helper with newline definition", () => {
  const interpreter = new Karacho();
  const template = interpreter.compile(
    `{{#default
        firstName = 'Bruce',
        lastName = 'Wayne',
        age = 35
     }}
     {{firstName}} {{lastName}} is {{age}} years old`,
  );

  const result = template();
  assertEquals(result.trim(), "Bruce Wayne is 35 years old");
});

Deno.test("create default helper with newline definition and partly predefined", () => {
  const interpreter = new Karacho();
  const template = interpreter.compile(
    `{{#default lastName = 'Wayne'}}
     {{firstName}} {{lastName}} is {{age}} years old`,
  );

  const result = template({ firstName: "Bruce", age: 35 });
  assertEquals(result.trim(), "Bruce Wayne is 35 years old");
});
