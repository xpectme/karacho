import { assertEquals } from "https://deno.land/std@0.152.0/testing/asserts.ts";
import { Karacho } from "./Karacho.ts";

Deno.test("registerHelper", () => {
  const interpreter = new Karacho();
  interpreter.registerHelper("foo", () => "bar");

  const result = interpreter.helpers.get("foo")!({}, {
    type: "helper",
    depth: 0,
    start: 0,
    end: 0,
    key: "foo",
    tag: "{{#foo}}",
  }, []); // 'bar'

  assertEquals(result, "bar");
});

Deno.test("registerHelper with arguments", () => {
  const interpreter = new Karacho();
  interpreter.registerHelper("foo", (value: string) => value);

  const result = interpreter.helpers.get("foo")!({ bar: "baz" }, {
    type: "helper",
    depth: 0,
    start: 0,
    end: 0,
    key: "foo",
    addition: "bar",
    tag: "{{#foo bar}}",
  }, []); // 'baz'

  assertEquals(result, "baz");
});

Deno.test("execute registered helper in template", () => {
  const interpreter = new Karacho();
  interpreter.registerHelper("foo", () => "bar");

  const template = interpreter.compile("{{#foo}}", {}); // 'bar'
  const result = template({});

  assertEquals(result, "bar");
});

Deno.test("execute registered helper in template with arguments", () => {
  const interpreter = new Karacho();
  interpreter.registerHelper("foo", (value: string) => value);

  const template = interpreter.compile("{{#foo bar}}", {}); // 'bar'
  const result = template({ bar: "baz" });

  assertEquals(result, "baz");
});

Deno.test("execute registered helper in template with value in tag", () => {
  const interpreter = new Karacho();
  interpreter.registerHelper("foo", (value: string) => value);

  const template = interpreter.compile('{{#foo "bar"}}', {}); // 'bar'
  const result = template({});

  assertEquals(result, "bar");
});

Deno.test("execute registered helper block", () => {
  const interpreter = new Karacho();
  interpreter.registerHelper("foo", (content: string) => content);

  const template = interpreter.compile("{{#foo}}bar{{/foo}}", {}); // 'bar'
  const result = template({});

  assertEquals(result, "bar");
});

Deno.test("execute registered helper block to mutate content", () => {
  const interpreter = new Karacho();
  interpreter.registerHelper("foo", (content: string) => content.toUpperCase());

  const template = interpreter.compile("{{#foo}}bar{{/foo}}", {}); // 'BAR'
  const result = template({});

  assertEquals(result, "BAR");
});

Deno.test("execute registered helper block with arguments", () => {
  const interpreter = new Karacho();
  interpreter.registerHelper(
    "foo",
    (value: string, content: string) => `<${value}>${content}</${value}>`,
  );

  const template = interpreter.compile("{{#foo bar}}bar{{/foo}}", {}); // 'baz'
  const result = template({ bar: "baz" });

  assertEquals(result, "<baz>bar</baz>");
});

Deno.test("execute registered helper block with variable", () => {
  const interpreter = new Karacho();
  interpreter.registerHelper(
    "foo",
    (value: string, content: string) => `<${value}>${content}</${value}>`,
  );

  const template = interpreter.compile('{{#foo "bar"}}{{name}}{{/foo}}', {}); // 'baz'
  const result = template({ name: "baz" });
  assertEquals(result, "<bar>baz</bar>");
});

Deno.test("execute registered helper block with new line", () => {
  const interpreter = new Karacho();
  interpreter.registerHelper(
    "foo",
    (value: string, content: string) => `<${value}>${content}</${value}>`,
  );

  const template = interpreter.compile("{{#foo bar}}\nbar\n{{/foo}}", {}); // 'baz'
  const result = template({ bar: "baz" });

  assertEquals(result, "<baz>\nbar\n</baz>");
});

Deno.test("execute block helper with object property, variable and value", () => {
  const interpreter = new Karacho();
  interpreter.registerHelper(
    "foo",
    (
      tag: string,
      name: string,
      age: number,
      content: string,
    ) => `<${tag}>${name} is ${age} years old. ${content}</${tag}>`,
  );

  const template = interpreter.compile(
    "{{#foo 'div', person.name, age}}He may pass.{{/foo}}",
    {},
  ); // 'baz'
  const result = template({ person: { name: "John" }, age: 18 });

  assertEquals(result, "<div>John is 18 years old. He may pass.</div>");
});

Deno.test("execute helper with content as object property", () => {
  const interpreter = new Karacho();
  interpreter.registerHelper(
    "foo",
    (
      tag: string,
      content: string,
    ) => {
      return `<${tag}>${content}</${tag}>`;
    },
  );

  const template = interpreter.compile(
    "[ {{#foo 'div', 'Hello there!'}} ]",
    {},
  ); // 'baz'
  const result = template({});

  assertEquals(result, "[ <div>John is 18 years old. Hello there!</div> ]");
});
