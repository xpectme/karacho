import { assertEquals } from "https://deno.land/std@0.152.0/testing/asserts.ts";
import { Bart } from "./Bart.ts";

Deno.test("registerHelper", () => {
  const bart = new Bart();
  bart.registerHelper("foo", () => "bar");

  const result = bart.helpers.get("foo")!({}, {
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
  const bart = new Bart();
  bart.registerHelper("foo", (_content: string, value: string) => value);

  const result = bart.helpers.get("foo")!({ bar: "baz" }, {
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
  const bart = new Bart();
  bart.registerHelper("foo", () => "bar");

  const template = bart.compile("{{#foo}}", {}); // 'bar'
  const result = template({});

  assertEquals(result, "bar");
});

Deno.test("execute registered helper in template with arguments", () => {
  const bart = new Bart();
  bart.registerHelper("foo", (_content: string, value: string) => value);

  const template = bart.compile("{{#foo bar}}", {}); // 'bar'
  const result = template({ bar: "baz" });

  assertEquals(result, "baz");
});

Deno.test("execute registered helper in template with value in tag", () => {
  const bart = new Bart();
  bart.registerHelper("foo", (_content: string, value: string) => value);

  const template = bart.compile('{{#foo "bar"}}', {}); // 'bar'
  const result = template({});

  assertEquals(result, "bar");
});

Deno.test("execute registered helper block", () => {
  const bart = new Bart();
  bart.registerHelper("foo", (content: string) => content);

  const template = bart.compile("{{#foo}}bar{{/foo}}", {}); // 'bar'
  const result = template({});

  assertEquals(result, "bar");
});

Deno.test("execute registered helper block to mutate content", () => {
  const bart = new Bart();
  bart.registerHelper("foo", (content: string) => content.toUpperCase());

  const template = bart.compile("{{#foo}}bar{{/foo}}", {}); // 'BAR'
  const result = template({});

  assertEquals(result, "BAR");
});

Deno.test("execute registered helper block with arguments", () => {
  const bart = new Bart();
  bart.registerHelper(
    "foo",
    (content: string, value: string) => `<${value}>${content}</${value}>`,
  );

  const template = bart.compile("{{#foo bar}}bar{{/foo}}", {}); // 'baz'
  const result = template({ bar: "baz" });

  assertEquals(result, "<baz>bar</baz>");
});

Deno.test("execute registered helper block with variable", () => {
  const bart = new Bart();
  bart.registerHelper(
    "foo",
    (content: string, value: string) => `<${value}>${content}</${value}>`,
  );

  const template = bart.compile('{{#foo "bar"}}{{name}}{{/foo}}', {}); // 'baz'
  const result = template({ name: "baz" });
  assertEquals(result, "<bar>baz</bar>");
});

Deno.test("execute registered helper block with new line", () => {
  const bart = new Bart();
  bart.registerHelper(
    "foo",
    (content: string, value: string) => `<${value}>${content}</${value}>`,
  );

  const template = bart.compile("{{#foo bar}}\nbar\n{{/foo}}", {}); // 'baz'
  const result = template({ bar: "baz" });

  assertEquals(result, "<baz>\nbar\n</baz>");
});
